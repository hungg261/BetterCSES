if (typeof browser === "undefined") var browser = chrome;

const chromeStorage = chrome.storage.local;
const topics = [];
const problemset = {};
let allProblemsFlat = [];

const getProblemId = () => {
    const match = location.pathname.match(/\/(task|submit|view|stats|hack|result)\/(\d+)/);
    return match ? match[2] : null;
};

const getTags = async (problemId) => {
    try {
        const response = await browser.runtime.sendMessage({ command: "fetch-tags", problemId });
        return response?.tags || [];
    } catch (e) { return []; }
};

const getTips = async (problemId) => {
    try {
        const response = await browser.runtime.sendMessage({ command: "fetch-tips", problemId });
        return response?.tips || [];
    } catch (e) { return []; }
};

const translateText = async (text, targetLang) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data[0].map(item => item[0]).join('');
    } catch (error) {
        return text;
    }
};

const createElementByHTMLtext = (htmlText) => {
    const template = document.createElement('template');
    template.innerHTML = htmlText.trim();
    return template.content.firstChild;
}

const injectStyles = () => {
    const style = document.createElement("style");
    style.innerHTML = `
        .ext-container {
            background-color: #f8f9fa;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
            color: #333;
        }
        .ext-summary {
            cursor: pointer;
            font-weight: bold;
            color: #d63384;
            font-size: 1.1em;
            margin-bottom: 5px;
            outline: none;
        }
        .ext-badge {
            font-size: 0.75em;
            background-color: #e9ecef;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 10px;
            color: #495057;
        }
        .ext-pre-wrapper {
            background-color: #f8f9fa;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            margin-bottom: 1.5em;
        }
        .ext-pre-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 12px;
            background-color: #e5e7eb;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            border-bottom: 1px solid #d1d5db;
            font-family: sans-serif;
            font-size: 0.85em;
            font-weight: bold;
            color: #6b7280;
        }
        body.dark .ext-container {
            background-color: #1e1e1e;
            border-color: #444;
            color: #e0e0e0;
        }
        body.dark .ext-summary {
            color: #ff80bf;
        }
        body.dark .ext-container a {
            color: #66b3ff;
        }
        body.dark .ext-badge {
            background-color: #333;
            color: #ccc;
        }
        body.dark .ext-pre-wrapper {
            background-color: #1e1e1e;
            border-color: #444;
        }
        body.dark .ext-pre-header {
            background-color: #2d2d2d;
            border-bottom-color: #444;
            color: #aaa;
        }
        body.dark .ext-pre-header button {
            color: #ddd !important;
        }
    `;
    document.head.appendChild(style);
}

const createTranslationSectionOnSidebar = () => {
    const sidebarElement = document.querySelector(".nav.sidebar");
    if (!sidebarElement) return;

    const container = document.createElement("div");
    container.id = "translate-container";

    const dividerLine = document.createElement("hr");
    const sectionTitle = document.createElement("h4");
    sectionTitle.innerHTML = "Translate (Beta)";
    sectionTitle.style.margin = "0.1em 0 0.5em 0";

    const langSelect = document.createElement("select");
    langSelect.style.width = "100%";
    langSelect.style.padding = "4px";
    langSelect.style.marginBottom = "10px";
    langSelect.style.cursor = "pointer";

    const languages = [
        { code: 'en', label: 'Original (English)' },
        { code: 'vi', label: 'Tiếng Việt' },
        { code: 'zh-CN', label: '中文 (Chinese)' },
        { code: 'fr', label: 'Français' }
    ];

    languages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang.code;
        option.innerHTML = lang.label;
        langSelect.appendChild(option);
    });

    langSelect.addEventListener("change", async () => {
        const selectedLang = langSelect.value;
        if (selectedLang === 'en') {
            location.reload();
            return;
        }

        langSelect.disabled = true;
        const originalOptionText = langSelect.options[langSelect.selectedIndex].text;
        langSelect.options[langSelect.selectedIndex].text = "Translating...";

        const contentDiv = document.querySelector(".content");
        const elementsToTranslate = contentDiv.querySelectorAll("p, li:not(.nav li)");
        
        for (let el of elementsToTranslate) {
             if (el.closest('.sidebar')) continue;
             const originalText = el.innerText;
             if (originalText.trim().length > 0) {
                 const translatedText = await translateText(originalText, selectedLang);
                 el.innerText = translatedText;
             }
        }
        
        langSelect.options[langSelect.selectedIndex].text = originalOptionText;
        langSelect.disabled = false;
    });

    container.appendChild(dividerLine);
    container.appendChild(sectionTitle);
    container.appendChild(langSelect);
    sidebarElement.appendChild(container);
};

const createTagsSectionOnSidebar = async () => {
    const sidebarElement = document.querySelector(".nav.sidebar");
    const problemId = getProblemId();
    if (!sidebarElement || !problemId) return;

    const tagsList = await getTags(problemId);

    const container = document.createElement("div");
    container.id = "tags-container";
    
    const dividerLine = document.createElement("hr");
    const sectionTitle = document.createElement("h4");
    sectionTitle.style.margin = "0.1em 0 0.5em 0";
    sectionTitle.innerHTML = "Tags";
    
    const showTags = document.createElement("details");
    showTags.id = "show-tags";
    const showTagsSummary = document.createElement("summary");
    showTagsSummary.innerHTML = "Show Tags";
    showTagsSummary.style.cursor = "pointer";
    showTags.appendChild(showTagsSummary);
    
    container.appendChild(dividerLine);
    container.appendChild(sectionTitle);
    container.appendChild(showTags);
    sidebarElement.appendChild(container);

    if (!tagsList || tagsList.length === 0) {
        const noTagsElement = document.createElement("p");
        noTagsElement.style.margin = "10px 0 0 0";
        noTagsElement.innerHTML = "No Tags";
        showTags.appendChild(noTagsElement);
        return;
    }

    const tagsListElement = document.createElement("ul");
    tagsListElement.id = "tags";
    tagsListElement.style.marginTop = "10px";
    tagsListElement.style.padding = "0";
    tagsListElement.style.display = "flex";
    tagsListElement.style.flexWrap = "wrap";
    tagsListElement.style.gap = "6px";
    showTags.appendChild(tagsListElement);

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
        tagsListElement.appendChild(tagElement);
    });
}

const createTipsSectionOnSidebar = async () => {
    const sidebarElement = document.querySelector(".nav.sidebar");
    const problemId = getProblemId();
    if (!sidebarElement || !problemId) return;

    const tips = await getTips(problemId);

    const container = document.createElement("div");
    container.id = "tips-container";
    
    const dividerLine = document.createElement("hr");
    const sectionTitle = document.createElement("h4");
    sectionTitle.innerHTML = "Tips";
    sectionTitle.style.margin = "0.6em 0 0.5em 0";
    
    const showTips = document.createElement("details");
    showTips.id = "show-tips";
    const showTipsSummary = document.createElement("summary");
    showTipsSummary.innerHTML = "Show Tips";
    showTipsSummary.style.cursor = "pointer";
    showTips.appendChild(showTipsSummary);
    
    container.appendChild(dividerLine);
    container.appendChild(sectionTitle);
    container.appendChild(showTips);
    sidebarElement.appendChild(container);

    if (!tips || tips.length === 0) {
        const noTipsElement = document.createElement("p");
        noTipsElement.style.margin = "10px 0 0 0";
        noTipsElement.innerHTML = "No Tips";
        showTips.appendChild(noTipsElement);
        return;
    }

    const tipsListElement = document.createElement("ul");
    tipsListElement.style.marginTop = "8px";
    tipsListElement.style.paddingLeft = "20px";
    showTips.appendChild(tipsListElement);

    tips.reverse().forEach((tip) => {
        const tipElement = document.createElement("li");
        tipElement.style.margin = "5px 0";
        tipElement.innerHTML = tip;
        tipsListElement.appendChild(tipElement);
    });
}

const createSolutionSectionOnNavbar = () => {
    const navbarElement = document.querySelector(".nav");
    if (!navbarElement) return;
    const ele = document.createElement("li");
    ele.style.cursor = "pointer";
    ele.addEventListener("click", () => {
        const contentDiv = document.querySelector(".content");
        if(contentDiv) contentDiv.innerHTML = "Solution Page";
        navbarElement.querySelector(".current")?.classList.remove("current");
        document.getElementById("solution")?.classList.add("current");
    });
    const a = document.createElement("a");
    a.id = "solution";
    a.innerHTML = "Solution"
    ele.appendChild(a);
    navbarElement.appendChild(ele);
}

const loadLanguageSelectorCache = () => {
    const languageSelector = document.getElementById("lang");
    const languageOption = document.getElementById("option");
    if(!languageSelector || !languageOption) return;

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
    if(!languageSelector || !languageOption) return;
    languageSelector.addEventListener("change", () => {
        chromeStorage.set({ language: languageSelector.value });
    });
    languageOption.addEventListener("change", () => {
        chromeStorage.set({ option: languageOption.value });
    });
}

const submitCodeFile = (fileData) => {
    const problemId = getProblemId();
    if (!problemId) return;
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
    }).catch((error) => console.error(error));
};

const createCodeInputArea = () => {
    const form = document.querySelector("form");
    if (!form) return;
    const codeInputArea = document.createElement("textarea");
    codeInputArea.id = "code";
    codeInputArea.style.width = "500px";
    codeInputArea.style.height = "300px";
    form.insertBefore(codeInputArea, form.children[5] || form.firstChild);
}

const modifySubmitButton = () => {
    const submitButton = document.querySelector("input[type='submit']");
    if (!submitButton) return;
    submitButton.addEventListener("click", (event) => {
        const codeElement = document.getElementById("code");
        if (!codeElement) return;
        const code = codeElement.value;
        if (code == "") {
            const fileInput = document.querySelector("input[type='file']");
            if (fileInput && fileInput.files.length > 0) submitCodeFile(fileInput.files[0]);
            return;
        }
        submitCodeFile(new Blob([code], { type: 'text/plain' }))
        event.preventDefault();
    });
}

const formatPreBlocks = () => {
    if (!location.href.includes("/task/")) return;
    
    const preElements = document.querySelectorAll(".content pre");
    preElements.forEach((pre) => {
        let labelText = "Text";
        const prevElement = pre.previousElementSibling;
        
        if (prevElement) {
            const text = prevElement.innerText.trim();
            if (/^(Input|Output):?$/i.test(text)) {
                labelText = text.replace(":", "").charAt(0).toUpperCase() + text.replace(":", "").slice(1).toLowerCase();
                prevElement.style.display = "none";
            }
        }

        const wrapper = document.createElement("div");
        wrapper.className = "ext-pre-wrapper";
        
        const header = document.createElement("div");
        header.className = "ext-pre-header";
        
        const label = document.createElement("span");
        label.innerHTML = labelText;
        
        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = "Copy";
        copyBtn.style.cursor = "pointer";
        copyBtn.style.border = "none";
        copyBtn.style.background = "transparent";
        copyBtn.style.color = "#374151";
        copyBtn.style.fontWeight = "600";
        
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(pre.innerText);
            copyBtn.innerHTML = "Copied!";
            setTimeout(() => { copyBtn.innerHTML = "Copy"; }, 2000);
        });
        
        header.appendChild(label);
        header.appendChild(copyBtn);
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        
        pre.style.margin = "0";
        pre.style.border = "none";
        pre.style.padding = "12px";
        pre.style.backgroundColor = "transparent";
        pre.style.overflowX = "auto";
    });
}

const buildDashboardAndTOC = () => {
    document.querySelectorAll("h2").forEach(h2 => {
        if (h2.innerText.includes("General")) {
            h2.style.display = "none";
            
            const taskList = h2.nextElementSibling;
            if (taskList && taskList.classList.contains("task-list")) {
                taskList.style.display = "none";
            }
        }
    });

    const contentDiv = document.querySelector(".content");
    const tasks = document.querySelectorAll(".task");
    const titleList = [...document.querySelectorAll("h2")];
    if (tasks.length === 0 || titleList.length === 0) return;

    let solved = 0;
    let untouched = 0;
    const attemptedNotAc = [];

    tasks.forEach(task => {
        const scoreSpan = task.querySelector(".task-score");
        const aTag = task.querySelector("a");
        if (scoreSpan) {
            if (scoreSpan.classList.contains("full")) {
                solved++;
            } else if (scoreSpan.classList.contains("zero") || scoreSpan.className.trim() !== "task-score icon") {
                attemptedNotAc.push({ title: aTag.innerText, url: aTag.href });
            } else { untouched++; }
        } else { untouched++; }
    });

    const total = solved + untouched + attemptedNotAc.length;

    const dashboard = document.createElement("details");
    dashboard.className = "ext-container";
    dashboard.open = true;
    
    const dashSummary = document.createElement("summary");
    dashSummary.className = "ext-summary";
    dashSummary.innerHTML = "Dashboard & Settings";
    dashboard.appendChild(dashSummary);

    const statsText = document.createElement("p");
    statsText.style.marginTop = "10px";
    statsText.innerHTML = `Total: <strong>${total}</strong> | Solved: <strong style="color:#198754">${solved}</strong> | Untouched: <strong>${untouched}</strong> | Attempted (Not AC): <strong style="color:#dc3545">${attemptedNotAc.length}</strong>`;
    dashboard.appendChild(statsText);

    if (attemptedNotAc.length > 0) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.style.cursor = "pointer";
        summary.style.fontWeight = "bold";
        summary.style.color = "#dc3545";
        summary.innerHTML = "Show Attempted (Not AC) Problems";
        
        const list = document.createElement("ul");
        list.style.marginTop = "10px";
        list.style.paddingLeft = "20px";

        attemptedNotAc.forEach(p => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = p.url;
            a.innerHTML = p.title;
            li.appendChild(a);
            list.appendChild(li);
        });

        details.appendChild(summary);
        details.appendChild(list);
        dashboard.appendChild(details);
    }

    dashboard.appendChild(document.createElement("hr"));
    
    const flattenWrapper = document.createElement("div");
    flattenWrapper.style.marginTop = "10px";

    const label = document.createElement("label");
    label.style.fontWeight = "bold";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.marginRight = "8px";

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" Flatten all problems into a single list"));
    flattenWrapper.appendChild(label);

    const globalContainer = document.createElement("div");
    globalContainer.id = "global-container";
    globalContainer.style.display = "none";
    globalContainer.style.marginTop = "15px";

    const globalSort = document.createElement("select");
    globalSort.style.marginBottom = "10px";
    globalSort.style.padding = "4px";
    globalSort.innerHTML = `
        <option value="default">Sort By Default</option>
        <option value="solvers">Sort By Number of Solvers</option>
        <option value="acRate">Sort By AC Rate</option>
    `;

    const globalList = document.createElement("ul");
    globalList.className = "task-list";

    const renderGlobalList = () => {
        globalList.innerHTML = "";
        let sorted = [...allProblemsFlat];
        if (globalSort.value === "solvers") {
            sorted.sort((a, b) => b.solvers - a.solvers);
        } else if (globalSort.value === "acRate") {
            sorted.sort((a, b) => b.acRate - a.acRate);
        }
        sorted.forEach(p => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = p.html;
            const li = tempDiv.firstElementChild;
            
            const badge = document.createElement("span");
            badge.innerHTML = p.topic;
            badge.className = "ext-badge";

            const aTag = li.querySelector("a");
            if (aTag) aTag.appendChild(badge);

            globalList.appendChild(li);
        });
    };

    globalSort.addEventListener("change", () => {
        chromeStorage.set({ "global-sort-rule": globalSort.value });
        renderGlobalList();
    });

    globalContainer.appendChild(globalSort);
    globalContainer.appendChild(globalList);
    contentDiv.appendChild(globalContainer);
    flattenWrapper.appendChild(globalContainer);
    dashboard.appendChild(flattenWrapper);

    const tocContainer = document.createElement("details");
    tocContainer.className = "ext-container";
    tocContainer.id = "toc-container";
    
    const tocSummary = document.createElement("summary");
    tocSummary.className = "ext-summary";
    tocSummary.innerHTML = "Table of Contents";
    tocContainer.appendChild(tocSummary);

    const ul = document.createElement("ul");
    ul.style.columnCount = "2";
    ul.style.listStyleType = "none";
    ul.style.padding = "0";
    ul.style.marginTop = "10px";

    const headersForTOC = [...document.querySelectorAll("h2")];
    headersForTOC.shift();

    headersForTOC.forEach((h2, index) => {
        h2.id = `topic-${index}`;
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#topic-${index}`;
        a.innerHTML = h2.innerHTML.split("<")[0];
        a.style.textDecoration = "none";
        a.style.display = "block";
        a.style.marginBottom = "5px";
        li.appendChild(a);
        ul.appendChild(li);
    });

    tocContainer.appendChild(ul);

    const firstH2 = contentDiv.querySelector("h2");
    if (firstH2) {
        contentDiv.insertBefore(dashboard, firstH2);
        contentDiv.insertBefore(tocContainer, firstH2);
    }

    const originalElements = [];
    document.querySelectorAll("h2, .task-list").forEach((el, index) => {
        if (el.tagName === "H2" && index === 0) return;
        if (el === globalList) return;
        originalElements.push(el);
    });

    checkbox.addEventListener("change", () => {
        chromeStorage.set({ "flatten-mode": checkbox.checked });
        if (checkbox.checked) {
            originalElements.forEach(el => el.style.display = "none");
            tocContainer.style.display = "none";
            globalContainer.style.display = "block";
            renderGlobalList();
        } else {
            originalElements.forEach(el => el.style.display = "");
            tocContainer.style.display = "block";
            globalContainer.style.display = "none";
        }
    });

    chromeStorage.get(["flatten-mode", "global-sort-rule"]).then(res => {
        if (res["global-sort-rule"]) {
            globalSort.value = res["global-sort-rule"];
        }
        if (res["flatten-mode"]) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
}

const generateProblemset = () => {
    document.querySelectorAll("h2").forEach(h2 => {
        if (h2.innerText.includes("General")) {
            h2.style.display = "none";
            
            const taskList = h2.nextElementSibling;
            if (taskList && taskList.classList.contains("task-list")) {
                taskList.style.display = "none";
            }
        }
    });

    const titleList = [...document.querySelectorAll("h2")];
    titleList.shift();
    titleList.forEach(el => topics.push(el.innerHTML.split("<")[0]));

    const taskGroups = [...document.querySelectorAll(".task-list")];
    if (taskGroups.length === 0) return;

    for (let i = 0; i < taskGroups.length; i++) {
        problemset[topics[i]] = [];
        const problems = [...taskGroups[i].children];
        problems.forEach((problem, index) => {
            const detailElement = problem.querySelector(".detail");
            let solvers = 0;
            let acRate = 0;
            if (detailElement) {
                const parts = detailElement.innerText.split("/");
                solvers = parseInt(parts.at(0)?.trim()) || 0;
                const submissions = parseInt(parts.at(1)?.trim()) || 1;
                acRate = solvers / submissions;
            }
            const defaultIndex = index;
            const html = problem.outerHTML;
            problemset[topics[i]].push({ defaultIndex, solvers, acRate, html });
            allProblemsFlat.push({ topic: topics[i], defaultIndex, solvers, acRate, html });
        });
    }
};

const sortByDefault = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => a.defaultIndex - b.defaultIndex).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const sortBySolvers = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => b.solvers - a.solvers).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const sortByACRate = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => b.acRate - a.acRate).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const createCustomSortSelector = () => {
    const titleList = [...document.querySelectorAll("h2")];
    if (titleList.length === 0) return;
    titleList.shift();
    titleList.forEach((element, index) => {
        const selector = createElementByHTMLtext(`
        <select style="margin-left:0.5rem; padding: 2px;">
            <option>Sort By Default</option>
            <option>Sort By Number of Solvers</option>
            <option>Sort By AC Rate</option>
        </select>
        `);
        const sortProblems = () => {
            if (selector.value == "Sort By Default") {
                sortByDefault(index);
            } else if (selector.value == "Sort By Number of Solvers") {
                sortBySolvers(index);
            } else if (selector.value == "Sort By AC Rate") {
                sortByACRate(index);
            }
            chromeStorage.get("sort-rule", (result) => {
                const sortRule = result["sort-rule"] ?? {};
                sortRule[index] = selector.value;
                chromeStorage.set({ "sort-rule": sortRule });
            });
        }
        selector.addEventListener("change", () => sortProblems());
        element.appendChild(selector);
    });
}

const applySortRule = () => {
    const titleList = [...document.querySelectorAll("h2")];
    chromeStorage.get("sort-rule", (result) => {
        const sortRule = result["sort-rule"] ?? {};
        titleList.shift();
        titleList.forEach((element, index) => {
            const selector = element.querySelector("select");
            if (selector && index in sortRule) {
                selector.value = sortRule[index];
                const event = new Event('change');
                selector.dispatchEvent(event);
            }
        });
    });
}

function addCopyToClipboardButton() {
    const actionBar = document.querySelector(".content .nav");
    const preElement = document.querySelector("pre");
    if (!actionBar || !preElement) return;
    
    const code = preElement.innerText;
    const button = createElementByHTMLtext(`
        <li style="cursor: pointer;">
            <a>Copy to clipboard</a>
        </li>
    `);

    button.addEventListener("click", () => {
        navigator.clipboard.writeText(code);
        const copyToClipboardButton = button.querySelector("a");
        copyToClipboardButton.innerHTML = "Copied! :)";
        setTimeout(() => { copyToClipboardButton.innerHTML = "Copy to clipboard"; }, 1000);
    });

    actionBar.appendChild(button);
}

const isSubmitPage = () => location.href.startsWith("https://cses.fi/problemset/submit");
const isProblemPage = () => {
    return [
        "https://cses.fi/problemset/submit/",
        "https://cses.fi/problemset/task/",
        "https://cses.fi/problemset/view/",
        "https://cses.fi/problemset/stats/",
        "https://cses.fi/problemset/hack/",
        "https://cses.fi/problemset/result/",
    ].some(url => location.href.startsWith(url));
}
const isResultPage = () => location.href.startsWith("https://cses.fi/problemset/result/");
const isProblemListPage = () => [
    "https://cses.fi/problemset/list/",
    "https://cses.fi/problemset/list",
    "https://cses.fi/problemset/",
    "https://cses.fi/problemset"
].includes(location.href);

const initExtension = () => {
    injectStyles();

    if (isSubmitPage()) {
        loadLanguageSelectorCache();
        createLanguageSelectorCache();
        createCodeInputArea();
        modifySubmitButton();
    }

    if (isProblemPage()) {
        formatPreBlocks();
        createTranslationSectionOnSidebar();
        createTagsSectionOnSidebar();
        createTipsSectionOnSidebar();
        createSolutionSectionOnNavbar();
    }

    if (isProblemListPage()) {
        generateProblemset();
        buildDashboardAndTOC();
        createCustomSortSelector();
        applySortRule();
    }

    if (isResultPage()) {
        addCopyToClipboardButton();
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExtension);
} else {
    initExtension();
}