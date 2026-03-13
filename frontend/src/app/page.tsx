"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Role = "staff" | "secretariat" | "case_manager" | "admin";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
};

type CaseItem = {
  _id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  location: string;
  severity: string;
  status: string;
  caseManager?: { _id?: string; name?: string; email?: string };
  notes?: { message: string; authorName: string; createdAt: string }[];
  attachment?: string;
};

type Poll = {
  _id: string;
  question: string;
  options: { label: string; votes: number }[];
  voters: string[];
};

type Analytics = {
  byStatus: { name: string; count: number }[];
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  openByDepartment: { name: string; count: number }[];
  hotspots: { department: string; category: string; count: number; flagged: boolean }[];
};

const initialAnalytics: Analytics = {
  byStatus: [],
  byCategory: [],
  byDepartment: [],
  openByDepartment: [],
  hotspots: [],
};

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [digest, setDigest] = useState<CaseItem[]>([]);
  const [impact, setImpact] = useState<{ raised: string; action: string; changed: string }[]>([]);
  const [minutes, setMinutes] = useState<{ _id: string; title: string; filePath: string }[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
  const [minutesSearch, setMinutesSearch] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    description: "",
    category: "Safety",
    department: "",
    location: "",
    severity: "Low",
    anonymous: false,
    attachment: null as File | null,
  });

  const [pollForm, setPollForm] = useState({ question: "", optionsText: "" });
  const [minuteForm, setMinuteForm] = useState({ title: "", file: null as File | null });

  const caseManagers = useMemo(
    () => users.filter((entry) => entry.role === "case_manager"),
    [users]
  );

  const apiCall = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }, [token]);

  const loadCoreData = useCallback(async (activeRole: Role) => {
    const tasks: Promise<unknown>[] = [
      apiCall("/api/cases").then((d) => setCases(d)),
      apiCall("/api/polls").then((d) => setPolls(d)),
      apiCall("/api/public/digest").then((d) => setDigest(d)),
      apiCall("/api/public/impact").then((d) => setImpact(d)),
      apiCall("/api/public/minutes").then((d) => setMinutes(d)),
    ];

    if (activeRole === "secretariat" || activeRole === "admin") {
      tasks.push(apiCall("/api/users").then((d) => setUsers(d)));
      tasks.push(apiCall("/api/analytics/dashboard").then((d) => setAnalytics(d)));
    }

    await Promise.all(tasks);
  }, [apiCall]);

  useEffect(() => {
    const savedToken = localStorage.getItem("neo_token") || "";
    if (!savedToken) return;

    setToken(savedToken);

    const bootstrap = async () => {
      try {
        const me = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (!me.ok) {
          localStorage.removeItem("neo_token");
          setToken("");
          setUser(null);
          return;
        }

        const profile = await me.json();
        const normalizedUser: User = {
          id: profile._id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          department: profile.department,
        };
        setUser(normalizedUser);
        await loadCoreData(normalizedUser.role);
      } catch {
        localStorage.removeItem("neo_token");
      }
    };

    bootstrap();
  }, [loadCoreData]);

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const result = await data.json();
      if (!data.ok) throw new Error(result.message || "Login failed");

      localStorage.setItem("neo_token", result.token);
      setToken(result.token);
      setUser(result.user);
      await loadCoreData(result.user.role);
      setMessage("Logged in successfully");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("neo_token");
    setToken("");
    setUser(null);
    setCases([]);
    setPolls([]);
    setDigest([]);
    setImpact([]);
    setMinutes([]);
    setAnalytics(initialAnalytics);
    setMessage("Logged out");
  };

  const submitCase = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", submissionForm.title);
      formData.append("description", submissionForm.description);
      formData.append("category", submissionForm.category);
      formData.append("department", submissionForm.department);
      formData.append("location", submissionForm.location);
      formData.append("severity", submissionForm.severity);
      formData.append("anonymous", String(submissionForm.anonymous));
      if (submissionForm.attachment) {
        formData.append("attachment", submissionForm.attachment);
      }

      await apiCall("/api/cases", {
        method: "POST",
        body: formData,
      });

      setMessage("Submission created with tracking ID");
      setSubmissionForm({
        title: "",
        description: "",
        category: "Safety",
        department: "",
        location: "",
        severity: "Low",
        anonymous: false,
        attachment: null,
      });
      await loadCoreData(user!.role);
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const assignCase = async (caseId: string, caseManagerId: string) => {
    try {
      await apiCall(`/api/cases/${caseId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseManagerId }),
      });
      await loadCoreData(user!.role);
      setMessage("Case assigned");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const updateCaseStatus = async (caseId: string, status: string, note = "") => {
    try {
      await apiCall(`/api/cases/${caseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      await loadCoreData(user!.role);
      setMessage("Case updated");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const createPoll = async (event: FormEvent) => {
    event.preventDefault();
    const options = pollForm.optionsText
      .split(",")
      .map((text) => text.trim())
      .filter(Boolean);

    try {
      await apiCall("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: pollForm.question, options }),
      });
      setPollForm({ question: "", optionsText: "" });
      await loadCoreData(user!.role);
      setMessage("Poll created");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const vote = async (pollId: string, optionIndex: number) => {
    try {
      await apiCall(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      await loadCoreData(user!.role);
      setMessage("Vote recorded");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const uploadMinute = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!minuteForm.file) throw new Error("Select a document first");

      const formData = new FormData();
      formData.append("title", minuteForm.title);
      formData.append("file", minuteForm.file);

      await apiCall("/api/public/minutes", { method: "POST", body: formData });
      setMinuteForm({ title: "", file: null });
      await loadCoreData(user!.role);
      setMessage("Minutes uploaded");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const searchMinutes = async () => {
    const data = await apiCall(`/api/public/minutes?search=${encodeURIComponent(minutesSearch)}`);
    setMinutes(data);
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <Card className="w-full space-y-4">
          <h1 className="text-2xl font-bold">NeoConnect Login</h1>
          <p className="text-sm text-slate-500">Use seeded credentials from README</p>
          <form className="space-y-3" onSubmit={onLogin}>
            <Input
              placeholder="Email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <Card className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NeoConnect</h1>
          <p className="text-sm text-slate-500">
            {user.name} • {user.role} • {user.department}
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          Logout
        </Button>
      </Card>

      {message && <p className="text-sm text-slate-700">{message}</p>}

      {user.role === "staff" && (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Submit Feedback / Complaint</h2>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitCase}>
            <Input
              placeholder="Title"
              value={submissionForm.title}
              onChange={(event) => setSubmissionForm((prev) => ({ ...prev, title: event.target.value }))}
              className="md:col-span-2"
            />
            <Textarea
              placeholder="Description"
              value={submissionForm.description}
              onChange={(event) =>
                setSubmissionForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="md:col-span-2"
            />
            <Select
              value={submissionForm.category}
              onValueChange={(value) => {
                if (typeof value !== "string" || !value) return;
                setSubmissionForm((prev) => ({ ...prev, category: value }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {["Safety", "Policy", "Facilities", "HR", "Other"].map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Department"
              value={submissionForm.department}
              onChange={(event) =>
                setSubmissionForm((prev) => ({ ...prev, department: event.target.value }))
              }
            />
            <Input
              placeholder="Location"
              value={submissionForm.location}
              onChange={(event) =>
                setSubmissionForm((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            <Select
              value={submissionForm.severity}
              onValueChange={(value) => {
                if (typeof value !== "string" || !value) return;
                setSubmissionForm((prev) => ({ ...prev, severity: value }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High"].map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={submissionForm.anonymous}
                onChange={(event) =>
                  setSubmissionForm((prev) => ({ ...prev, anonymous: event.target.checked }))
                }
              />
              Submit anonymously
            </label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={(event) =>
                setSubmissionForm((prev) => ({
                  ...prev,
                  attachment: event.target.files?.[0] || null,
                }))
              }
              className="md:col-span-2"
            />
            <Button className="md:col-span-2">Submit</Button>
          </form>
        </Card>
      )}

      {(user.role === "secretariat" || user.role === "case_manager" || user.role === "staff") && (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Case Lifecycle</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {cases.map((item) => (
                  <TableRow key={item._id} className="align-top">
                    <TableCell className="font-medium">{item.trackingId}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <Badge>{item.status}</Badge>
                    </TableCell>
                    <TableCell>{item.caseManager?.name || "Unassigned"}</TableCell>
                    <TableCell className="space-y-2">
                      {user.role === "secretariat" && (
                        <div className="flex gap-2">
                          <Select
                            onValueChange={(value) => {
                              if (typeof value !== "string" || !value) return;
                              assignCase(item._id, value);
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assign manager" />
                            </SelectTrigger>
                            <SelectContent>
                            {caseManagers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(user.role === "case_manager" || user.role === "secretariat") && (
                        <div className="flex gap-2">
                          <Select
                            onValueChange={(value) => {
                              if (typeof value !== "string" || !value) return;
                              updateCaseStatus(item._id, value);
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Assigned", "In Progress", "Pending", "Resolved", "Escalated"].map(
                                (status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            onClick={() => updateCaseStatus(item._id, "In Progress", "Follow-up added")}
                          >
                            Add Note
                          </Button>
                        </div>
                      )}

                      {item.attachment && (
                        <a
                          href={`${API_URL}${item.attachment}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 underline"
                        >
                          Attachment
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {(user.role === "staff" || user.role === "secretariat") && (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Polling System</h2>

          {user.role === "secretariat" && (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createPoll}>
              <Input
                placeholder="Poll question"
                className="md:col-span-2"
                value={pollForm.question}
                onChange={(event) => setPollForm((prev) => ({ ...prev, question: event.target.value }))}
              />
              <Input
                placeholder="Comma separated options"
                className="md:col-span-2"
                value={pollForm.optionsText}
                onChange={(event) =>
                  setPollForm((prev) => ({ ...prev, optionsText: event.target.value }))
                }
              />
              <Button className="md:col-span-2">Create Poll</Button>
            </form>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {polls.map((poll) => (
              <Card key={poll._id} className="space-y-3">
                <p className="font-semibold">{poll.question}</p>
                <div className="space-y-2">
                  {poll.options.map((option, index) => (
                    <div key={option.label} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{option.label}</span>
                      {user.role === "staff" ? (
                        <Button variant="outline" onClick={() => vote(poll._id, index)}>
                          Vote ({option.votes})
                        </Button>
                      ) : (
                        <Badge>{option.votes} votes</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Public Hub</h2>

        <div className="space-y-2">
          <h3 className="font-semibold">Quarterly Digest</h3>
          <ul className="space-y-2 text-sm">
            {digest.map((entry) => (
              <li key={entry._id} className="rounded border border-slate-200 p-2">
                <span className="font-medium">{entry.trackingId}</span> • {entry.title} ({entry.category})
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Impact Tracking</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raised</TableHead>
                <TableHead>Action Taken</TableHead>
                <TableHead>What Changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {impact.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{entry.raised}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>{entry.changed}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Minutes Archive</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Search minutes"
              value={minutesSearch}
              onChange={(event) => setMinutesSearch(event.target.value)}
            />
            <Button variant="outline" onClick={searchMinutes}>
              Search
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {minutes.map((entry) => (
              <li key={entry._id} className="rounded border border-slate-200 p-2">
                <a
                  href={`${API_URL}${entry.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline"
                >
                  {entry.title}
                </a>
              </li>
            ))}
          </ul>

          {user.role === "secretariat" && (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={uploadMinute}>
              <Input
                placeholder="Document title"
                value={minuteForm.title}
                onChange={(event) => setMinuteForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <Input
                type="file"
                accept=".pdf"
                onChange={(event) =>
                  setMinuteForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                }
              />
              <Button className="md:col-span-2">Upload Minutes</Button>
            </form>
          )}
        </div>
      </Card>

      {(user.role === "secretariat" || user.role === "admin") && (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Analytics Dashboard</h2>

          <div className="h-64 rounded border border-slate-200 p-2">
            <p className="mb-2 text-sm font-medium">Open Cases by Department</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.openByDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#0f172a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[{ title: "By Status", data: analytics.byStatus }, { title: "By Category", data: analytics.byCategory }, { title: "By Department", data: analytics.byDepartment }].map(
              (block) => (
                <Card key={block.title} className="space-y-2 p-3">
                  <p className="font-semibold">{block.title}</p>
                  {block.data.map((entry) => (
                    <p key={entry.name} className="text-sm">
                      {entry.name}: {entry.count}
                    </p>
                  ))}
                </Card>
              )
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Hotspot Flagging (5+ recurring open cases)</h3>
            {analytics.hotspots.length === 0 && <p className="text-sm text-slate-500">No hotspots currently.</p>}
            {analytics.hotspots.map((spot, idx) => (
              <div key={idx} className="rounded border border-amber-300 bg-amber-50 p-2 text-sm">
                {spot.department} • {spot.category} • {spot.count} cases (flagged)
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
