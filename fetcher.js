async function run() {
  const response = await fetch("https://exofop.ipac.caltech.edu/tess/download_toi.php?sort=toi&output=pipe");
  const text = await response.text();
  console.log("Lines:", text.split('\n').length);
  console.log("Headers:", text.split('\n')[0]);
  console.log("First row:", text.split('\n')[1]);
}
run();
