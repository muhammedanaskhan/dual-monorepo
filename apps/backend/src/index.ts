import express from express;
import cors from cors;
import dotenv from dotenv;
import { PrismaClient } from @prisma/client;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

app.get(/health, (_req, res) => {
  res.json({ ok: true });
});

app.get(/users, async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
