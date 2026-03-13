require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");

const seedUsers = [
  {
    name: "Asha Staff",
    email: "staff@neo.com",
    password: "password123",
    role: "staff",
    department: "Facilities",
  },
  {
    name: "Ravi Secretariat",
    email: "secretariat@neo.com",
    password: "password123",
    role: "secretariat",
    department: "Management",
  },
  {
    name: "Meera Case Manager",
    email: "manager@neo.com",
    password: "password123",
    role: "case_manager",
    department: "HR",
  },
  {
    name: "Ishaan Admin",
    email: "admin@neo.com",
    password: "password123",
    role: "admin",
    department: "IT",
  },
];

const run = async () => {
  await connectDB();

  for (const payload of seedUsers) {
    const exists = await User.findOne({ email: payload.email });
    if (!exists) {
      await User.create(payload);
      console.log(`Created ${payload.email}`);
    }
  }

  console.log("Seeding complete");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
