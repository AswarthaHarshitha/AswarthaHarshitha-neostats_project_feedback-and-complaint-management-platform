require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");
const { runEscalationCheck } = require("./utils/escalation");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    await runEscalationCheck();
    setInterval(() => {
      runEscalationCheck().catch((err) => console.error("Escalation check failed", err.message));
    }, 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup error", err);
    process.exit(1);
  }
};

start();
