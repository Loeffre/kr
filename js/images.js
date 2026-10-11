const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function findImage(folder, name, onFound, onMissing) {
  let index = 0;
  const tryNext = () => {
    if (index >= IMAGE_EXTENSIONS.length) {
      onMissing();
      return;
    }
    const url = `${folder}${name}.${IMAGE_EXTENSIONS[index]}`;
    index += 1;
    const probe = new Image();
    probe.onload = () => onFound(url);
    probe.onerror = tryNext;
    probe.src = url;
  };
  tryNext();
}
