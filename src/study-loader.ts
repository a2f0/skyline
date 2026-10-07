(() => {
  const entry = document.currentScript!.dataset["study"]!;
  function showStudyError(message: string) {
    document.querySelector<HTMLElement>("#loading")!.textContent = message;
    document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
  }
  if (location.protocol === "file:") {
    const page = location.pathname.split("/").pop();
    showStudyError(`Start a local server with python3 -m http.server, then open http://localhost:8000/${page} to explore the 3D study.`);
  } else {
    import(entry).catch((error) => {
      console.error(error);
      showStudyError("The 3D preview could not load. Check that WebGL 2 is enabled, then reload. You can still compare the SVG or return to the skyline.");
    });
  }
})();
