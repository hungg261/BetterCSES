if (typeof browser === "undefined") var browser = chrome;

const chromeStorage = chrome.storage.local;
const topics = [];
const problemset = {};

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
        let labelText = "text";
        const prevElement = pre.previousElementSibling;
        
        if (prevElement) {
            const text = prevElement.innerText.trim();
            if (/^(Input|Output):?$/i.test(text)) {
                labelText = text.replace(":", "").charAt(0).toUpperCase() + text.replace(":", "").slice(1).toLowerCase();
                prevElement.style.display = "none";
            }
        }

        const wrapper = document.createElement("div");
        wrapper.style.backgroundColor = "#f8f9fa";
        wrapper.style.border = "1px solid #d1d5db";
        wrapper.style.borderRadius = "6px";
        wrapper.style.marginBottom = "1.5em";
        
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.padding = "6px 12px";
        header.style.backgroundColor = "#e5e7eb";
        header.style.borderTopLeftRadius = "5px";
        header.style.borderTopRightRadius = "5px";
        header.style.borderBottom = "1px solid #d1d5db";
        header.style.fontFamily = "sans-serif";
        header.style.fontSize = "0.85em";
        
        const label = document.createElement("span");
        label.innerHTML = labelText;
        label.style.color = "#6b7280";
        label.style.fontWeight = "bold";
        
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

const createElementByHTMLtext = (htmlText) => {
    const template = document.createElement('template');
    template.innerHTML = htmlText.trim();
    return template.content.firstChild;
}

const generateProblemset = () => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    if (taskGroups.length === 0) return;
    taskGroups.shift();
    for (let i = 0; i < taskGroups.length; i++) {
        problemset[topics[i]] = [];
        const problems = [...taskGroups[i].children];
        problems.forEach((problem, index) => {
            const solvers = problem.querySelector(".detail").innerText.split("/").at(0).trim();
            const defaultIndex = index;
            const html = problem.outerHTML;
            problemset[topics[i]].push({ defaultIndex, solvers, html });
        });
    }
};

const sortByDefault = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups.shift();
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => a.defaultIndex - b.defaultIndex).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const sortBySolvers = (topicIndex) => {
    const taskGroups = [...document.querySelectorAll(".task-list")];
    taskGroups.shift();
    taskGroups[topicIndex].innerHTML = "";
    problemset[topics[topicIndex]].sort((a, b) => b.solvers - a.solvers).forEach((problem) => {
        taskGroups[topicIndex].innerHTML += problem.html;
    });
}

const createCustomSortSelector = () => {
    const titleList = [...document.querySelectorAll("h2")];
    if (titleList.length === 0) return;
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
            <a>copy to clipboard</a>
        </li>
    `);

    button.addEventListener("click", () => {
        navigator.clipboard.writeText(code);
        const copyToClipboardButton = button.querySelector("a");
        copyToClipboardButton.innerHTML = "copied :)";
        setTimeout(() => { copyToClipboardButton.innerHTML = "copy to clipboard"; }, 1000);
    });

    actionBar.appendChild(button);
}

const initExtension = () => {
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
        createCustomSortSelector();
        generateProblemset();
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