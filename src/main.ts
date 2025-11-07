import express from "express";

const app = express();
const APP_PORT = 3000;

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.listen(3000, () => {
  console.log(`App listening on port ${APP_PORT}`);
});
