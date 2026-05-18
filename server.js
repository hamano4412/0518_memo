const { createApp } = require('./src/app');

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.ready
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
