export default function sleep(timeout: number) {
  return new Promise(function (resolve, reject) {
    setTimeout(() => resolve(), timeout);
  });
}
