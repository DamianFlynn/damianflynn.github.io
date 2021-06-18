function createCopyButton(highlight) {
  const button = document.createElement("button");
  button.className = "copy-code-button";
  button.type = "button";
  button.innerText = "Copy";
  button.addEventListener("click", () => copyCodeToClipboard(button, highlight));
  addCopyButtonToDom(button, highlight);
  //addTitleToDom(highlight);
}

async function copyCodeToClipboard(button, highlight) {
  const codeElement = highlight.querySelector(":last-child > .chroma > code");
  const codeToCopy = codeElement.innerText;
  try {
    result = await navigator.permissions.query({ name: "clipboard-write" });
    if (result.state == "granted" || result.state == "prompt") {
      await navigator.clipboard.writeText(codeToCopy);
    } else {
      copyCodeBlockExecCommand(codeToCopy, highlight);
    }
  } catch (_) {
    copyCodeBlockExecCommand(codeToCopy, highlight);
  }
  finally {
    codeWasCopied(button);
  }
}

function copyCodeBlockExecCommand(codeToCopy, highlight) {
  const textArea = document.createElement("textArea");
  textArea.className = "copyable-text-area";
  textArea.value = codeToCopy;
  highlight.insertBefore(textArea, highlight.firstChild);
  textArea.select();
  document.execCommand("copy");
  highlight.removeChild(textArea);
}

function codeWasCopied(button) {
  button.blur();
  button.innerText = "Copied!";
  setTimeout(function() {
    button.innerText = "Copy";
  }, 2000);
}

function addCopyButtonToDom(button, highlight) {
  highlight.insertBefore(button, highlight.firstChild);
  const wrapper = document.createElement("div");
  wrapper.className = "highlight-wrapper";
  highlight.parentNode.insertBefore(wrapper, highlight);
  wrapper.appendChild(highlight);
}

/*
function addTitleToDom(highlight) {
  let code = highlight.firstElementChild.firstElementChild;
  let codeName = code ? code.className.split(":")[1] : null;

  if (codeName) {
    let div = document.createElement("div");
    div.textContent = codeName;
    div.classList.add("code-name-tag");
    code.parentNode.insertBefore(div, code);
  }
  
}
*/

document.querySelectorAll(".highlight")
  .forEach(highlight => createCopyButton(highlight));

