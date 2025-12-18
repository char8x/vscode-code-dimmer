const a = () =>
  console.log('a');

const b = (text: string) =>
  text.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const c = () => Math.random();
