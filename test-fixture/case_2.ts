export const fn = () => {
  const setTimeout = (a: Function, b: number) => console.log(a, b);

  const p1 = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 2000);
  });

  const p2 = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  return Promise.race([p1, p2]);
};

export const fn2 = () => {
  const p1 = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 2000);
  });

  const p2 = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  return Promise.race([p1, p2]);
};
