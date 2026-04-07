if (typeof browser === "undefined") var browser = chrome;

const chromeStorage = chrome.storage.local;

const problemId = document.querySelector(".nav").children[0].firstChild.href.split("/").at(-2);
const navbarElement = document.querySelector(".nav");
const sidebarElement = document.querySelector(".nav.sidebar");
const topics = [];
const problemset = {};

const getTags = (problemId) =>
    browser.runtime.sendMessage({
        command: "fetch-tags",
        problemId: problemId
    }).then(response => response.tags);

const getTips = (problemId) =>
    browser.runtime.sendMessage({
        command: "fetch-tips",
        problemId: problemId
    }).then(response => response.tips);

const createTagsSectionOnSidebar = async () => {
    const container = document.createElement("div");
    container.id = "tags-container";
    
    const sectionTitle = document.createElement("h4");
    sectionTitle.style.margin = "0.1em 0 0.5em 0";
    sectionTitle.innerHTML = "Tags";
    
    const showTags = document.createElement("details");
    showTags.id = "show-tags";
    const showTagsSummary = document.createElement("summary");
    showTagsSummary.innerHTML = "Show Tags";
    showTagsSummary.style.cursor = "pointer";
    showTags.appendChild(showTagsSummary);
    
    const tagsListElement = document.createElement("ul");
    tagsListElement.id = "tags";
    tagsListElement.style.marginTop = "10px";
    tagsListElement.style.padding = "0";
    tagsListElement.style.display = "flex";
    tagsListElement.style.flexWrap = "wrap";
    tagsListElement.style.gap = "6px";
    showTags.appendChild(tagsListElement);
    
    const dividerLine = document.createElement("hr");

    container.appendChild(sectionTitle);
    container.appendChild(showTags);
    container.appendChild(dividerLine);
    
    sidebarElement.insertBefore(container, sidebarElement.firstChild);

    const tagsList = await getTags(problemId);

    if (tagsList.length == 0) {
        const noTagsElement = document.createElement("p");
        noTagsElement.style.margin = "0px";
        noTagsElement.innerHTML = "No Tags";
        document.getElementById("show-tags").outerHTML = noTagsElement.outerHTML;
        return;
    }

    tagsList.forEach((tag) => {
        const tagElement = document.createElement("li");
        tagElement.innerHTML = tag;
        tagElement.style.listStyle = "none";
        tagElement.style.backgroundColor = "#f3f4f6";
        tagElement.style.color = "#d63384";
        tagElement.style.padding = "2px 6px";
        tagElement.style.borderRadius = "4px";
        tagElement.style.fontFamily = "monospace";
        tagElement.style.fontSize = "0.9em";
        tagElement.style.border = "1px solid #d1d5db";
        
        document.getElementById("tags").appendChild(tagElement);
    });
}

const createTipsSectionOnSidebar = async () => {
    const container = document.createElement("div");
    container.id = "tips-container";
    
    const sectionTitle = document.createElement("h4");
    sectionTitle.innerHTML = "Tips";
    sectionTitle.style.margin = "0.6em 0 0.5em 0";
    
    const showTips = document.createElement("details");
    showTips.id = "show-tips";
    const showTipsSummary = document.createElement("summary");
    showTipsSummary.innerHTML = "Show Tips";
    showTipsSummary.style.cursor = "pointer";
    showTips.appendChild(showTipsSummary);
    
    const tipsListElement = document.createElement("ul");
    tipsListElement.style.marginTop = "8px";
    tipsListElement.style.paddingLeft = "20px";
    showTips.appendChild(tipsListElement);

    const dividerLine = document.createElement("hr");

    container.appendChild(sectionTitle);
    container.appendChild(showTips);
    container.appendChild(dividerLine);
    
    sidebarElement.insertBefore(container, sidebarElement.firstChild);

    const tips = await getTips(problemId);

    if (tips.length == 0) {
        const noTipsElement = document.createElement("p");
        noTipsElement.style.margin = "0px";
        noTipsElement.innerHTML = "No Tips";
        document.getElementById("show-tips").outerHTML = noTipsElement.outerHTML;
        return;
    }

    tips.reverse().forEach((tip) => {
        const tipElement = document.createElement("li");
        tipElement.style.margin = "5px 0";
        tipElement.innerHTML = tip;
        tipsListElement.appendChild(tipElement);
    });
}

const createSolutionSectionOnNavbar = () => {
    const ele = document.createElement("li");
    ele.style.cursor = "pointer";
    ele.addEventListener("click", () => {
        document.querySelector(".content").innerHTML = "Solution Page";
        navbarElement.querySelector(".current").classList.remove("current");
        document.getElementById("solution").classList.add("current");
    });
    const a = document.createElement("a");
    a.id = "solution";
    a.innerHTML = "Solution"
    ele.appendChild(a);
    const nav = document.querySelector(".nav");
    nav.appendChild(ele);
}

const loadLanguageSelectorCache = () => {
    const languageSelector = document.getElementById("lang");
    const languageOption = document.getElementById("option");

    chromeStorage.get(["language", "option"]).then((result) => {
        setTimeout(() => {
            if (result.language) languageSelector.value = result.language;
            languageSelector.dispatchEvent(new Event('change'));
            setTimeout(() => {
                if (result.option) languageOption.value = result.option;
                languageSelector.dispatchEvent(new Event('change'));
            }, 300);
        }, 300);
    });
}

const createLanguageSelectorCache = () => {
    const languageSelector = document.getElementById("lang");
    const languageOption = document.getElementById("option");
    languageSelector.addEventListener("change", () => {
        chromeStorage.set({ language: languageSelector.value });
    });
    languageOption.addEventListener("change", () => {
        chromeStorage.set({ option: languageOption.value });
    });
}

const submitCodeFile = (fileData) => {
    const formData = new FormData();
    const languageSelector = document.getElementById("lang");
    const languageOption = document.getElementById("option");
    const csrfToken = document.querySelector("input[name='csrf_token']").value;
    formData.append('csrf_token', csrfToken);
    formData.append('task', problemId);
    formData.append('lang', languageSelector.value);
    if (!languageOption.disabled) formData.append('option', languageOption.value);
    formData.append('target', 'problemset');
    formData.append('type', 'course');
    formData.append('file', fileData, 'code.cpp');
    fetch('/course/send.php', {
        method: 'POST',
        body: formData
    }).then((response) => {
        if (response.ok) {
            location.href = response.url;
        }
    }).catch((error) => {
        console.error('Error:', error);
    });
};

const createCodeInputArea = () => {
    const codeInputArea = document.createElement("textarea");
    codeInputArea.id = "code";
    codeInputArea.style.width = "500px";
    codeInputArea.style.height = "300px";
    const form = document.querySelector("form");
    form.insertBefore(codeInputArea, form.children[5]);
}

const modifySubmitButton = () => {
    const submitButton = document.querySelector("input[type='submit']");
    submitButton.addEventListener("click", (event) => {
        const code = document.getElementById("code").value;
        if (code == "") {
            const fileInput = document.querySelector("input[type='file']");
            submitCodeFile(fileInput.files[0]);
            return;
        }
        submitCodeFile(new Blob([code], { type: 'text/plain' }))
        event.preventDefault();
    });
}

const isSubmitPage = () => location.href.startsWith("https://cses.fi/problemset/submit");

const isProblemPage = () => {
    let result = false;
    const possibleUrls = [
        "https://cses.fi/problemset/submit/",
        "https://cses.fi/problemset/task/",
        "https://cses.fi/problemset/view/",
        "https://cses.fi/problemset/stats/",
        "https://cses.fi/problemset/hack/",
        "https://cses.fi/problemset/result/",
    ];
    possibleUrls.forEach((url) => {
        if (location.href.startsWith(url)) result = true;
    });
    return result;
}

const isResultPage = () => location.href.startsWith("https://cses.fi/problemset/result/");

const isProblemListPage = () => [
    "https://cses.fi/problemset/list/",
    "https://cses.fi/problemset/list",
    "https://cses.fi/problemset/",
    "https://cses.fi/problemset"
].includes(location.href);

const createElementByHTMLtext = (htmlText) => {
    const template = document.createElement('template');
    template.innerHTML = htmlText.trim();
    return template.content.firstChild;
}

const generateProblemset = () => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups.shift();
    for (let i = 0; i < taskGroups.length; i++) {
        problemset[topics[i]] = [];
        const problems = [...taskGroups[i].children];
        problems.forEach((problem, index) => {
            const solvers = problem.querySelector(".detail").innerText.split("/").at(0).trim();
            const defaultIndex = index;
            const html = problem.outerHTML;
            problemset[topics[i]].push({
                defaultIndex,
                solvers,
                html
            });
        });
    }
};

const sortByDefault = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups.shift();
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => {
        return a.defaultIndex - b.defaultIndex;
    }).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const sortBySolvers = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups.shift();
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => {
        return b.solvers - a.solvers;
    }).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const createCustomSortSelector = () => {
    const titleList = [...document.querySelectorAll("h2")];
    titleList.shift();
    titleList.forEach((element, index) => {
        const selector = createElementByHTMLtext(`
        <select style="margin-left:0.5rem">
            <option>Sort By Default</option>
            <option>Sort By Number of Solvers</option>
        </select>
        `);
        const sortProblems = () => {
            if (selector.value == "Sort By Default") {
                sortByDefault(index);
            } else if (selector.value == "Sort By Number of Solvers") {
                sortBySolvers(index);
            }
            chromeStorage.get("sort-rule", (result) => {
                const sortRule = result["sort-rule"] ?? {};
                sortRule[index] = selector.value;
                chromeStorage.set({ "sort-rule": sortRule });
            });
        }
        selector.addEventListener("change", () => sortProblems());
        element.appendChild(selector);
        topics.push(element.innerHTML.split("<")[0]);
    });
}

const applySortRule = () => {
    const titleList = [...document.querySelectorAll("h2")];
    chromeStorage.get("sort-rule", (result) => {
        const sortRule = result["sort-rule"] ?? {};
        titleList.shift();
        titleList.forEach((element, index) => {
            const selector = element.querySelector("select");
            if (index in sortRule) {
                selector.value = sortRule[index];
                const event = new Event('change');
                selector.dispatchEvent(event);
            }
        });
    });
}

function addCopyToClipboardButton() {
    const actionBar = document.querySelector(".content .nav");
    const code = document.querySelector("pre").innerText;

    const button = createElementByHTMLtext(`
        <li style="cursor: pointer;">
            <a>copy to clipboard</a>
        </li>
    `);

    button.addEventListener("click", () => {
        navigator.clipboard.writeText(code);
        const copyToClipboardButton = button.querySelector("a");
        copyToClipboardButton.innerHTML = "copied :)";
        setTimeout(() => {
            copyToClipboardButton.innerHTML = "copy to clipboard";
        }, 1000);
    });

    actionBar.appendChild(button);
}

if (isSubmitPage()) {
    loadLanguageSelectorCache();
    createLanguageSelectorCache();
    createCodeInputArea();
    modifySubmitButton();
}

if (isProblemPage()) {
    createTipsSectionOnSidebar();
    createTagsSectionOnSidebar();
    createSolutionSectionOnNavbar();
}

if (isProblemListPage()) {
    createCustomSortSelector();
    generateProblemset();
    applySortRule();
}

if (isResultPage()) {
    addCopyToClipboardButton();
}