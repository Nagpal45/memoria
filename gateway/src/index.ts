import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Memoria Gateway is running on port ${PORT}`);
});
