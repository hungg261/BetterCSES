// 28.04.26

if (typeof browser === "undefined") var browser = chrome;

const chromeStorage = chrome.storage.local;
let allProblemsFlat = [];

const getProblemId = () => {
    const match = location.pathname.match(/\/(task|submit|view|stats|hack|result)\/(\d+)/);
    return match ? match[2] : null;
};

let tagsDB = null;
let tipsDB = null;

const fetchWithTimeout = async (url, timeout = 2000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error("HTTP error");
        return await response.json();
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const loadDataWithFallback = async (remoteUrl, localUrl) => {
    try {
        return await fetchWithTimeout(remoteUrl, 2000);
    } catch (e) {
        try {
            const localResponse = await fetch(localUrl);
            return await localResponse.json();
        } catch (localErr) {
            return {};
        }
    }
};

const getTags = async (problemId) => {
    if (!tagsDB) {
        tagsDB = await loadDataWithFallback(
            "https://raw.githubusercontent.com/hungg261/BetterCSES/refs/heads/master/database/tags.json",
            browser.runtime.getURL("database/tags.json")
        );
    }
    return tagsDB[problemId] || [];
};

const getTips = async (problemId) => {
    if (!tipsDB) {
        tipsDB = await loadDataWithFallback(
            "https://raw.githubusercontent.com/hungg261/BetterCSES/refs/heads/master/database/tips.json",
            browser.runtime.getURL("database/tips.json")
        );
    }
    return tipsDB[problemId] || [];
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
        .ext-container { background-color: #f8f9fa; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin-bottom: 20px; color: #333; }
        .ext-summary { cursor: pointer; font-weight: bold; color: #d63384; font-size: 1.1em; margin-bottom: 5px; outline: none; }
        .ext-badge { font-size: 0.75em; background-color: #e9ecef; padding: 2px 6px; border-radius: 10px; margin-left: 10px; color: #495057; }
        .ext-topic-stats { font-size: 0.8em; color: #666; margin-top: -10px; margin-bottom: 10px; font-weight: normal; }
        .ext-pre-wrapper { background-color: #f8f9fa; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 1.5em; }
        .ext-pre-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background-color: #e5e7eb; border-top-left-radius: 5px; border-top-right-radius: 5px; border-bottom: 1px solid #d1d5db; font-family: sans-serif; font-size: 0.85em; font-weight: bold; color: #6b7280; }
        body.dark .ext-container { background-color: #1e1e1e; border-color: #444; color: #e0e0e0; }
        body.dark .ext-summary { color: #ff80bf; }
        body.dark .ext-badge { background-color: #333; color: #ccc; }
        body.dark .ext-topic-stats { color: #aaa; }
        body.dark .ext-pre-wrapper { background-color: #1e1e1e; border-color: #444; }
        body.dark .ext-pre-header { background-color: #2d2d2d; border-bottom-color: #444; color: #aaa; }
    `;
    document.head.appendChild(style);
}

const addSubmitHotkey = () => {
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const submitFormBtn = document.querySelector('input[type="submit"], button[type="submit"]');
            if (submitFormBtn) {
                e.preventDefault();
                submitFormBtn.click();
                return;
            }

            const submitLink = document.querySelector('a[href^="/problemset/submit/"]');
            if (submitLink) {
                e.preventDefault();
                window.location.href = submitLink.href;
            }
        }
    });
};

const addProblemNavigation = () => {
    const sidebarLinks = Array.from(document.querySelectorAll('.nav.sidebar a[href*="/task/"]'));
    if (sidebarLinks.length === 0) return;

    const currentIndex = sidebarLinks.findIndex(a => 
        window.location.pathname.includes(a.getAttribute('href')) || a.classList.contains('current')
    );
    
    if (currentIndex === -1) return;

    const navContainer = document.createElement("div");
    Object.assign(navContainer.style, {
        position: "fixed",
        bottom: "80px",
        right: "30px",
        display: "flex",
        gap: "5px",
        zIndex: "10000",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out",
        pointerEvents: "none"
    });

    const btnStyle = {
        width: "40px",
        height: "40px",
        backgroundColor: "#e9ecef",
        color: "#000",
        border: "1px solid #000",
        borderRadius: "0",
        fontSize: "20px",
        cursor: "pointer",
        padding: "0",
        boxSizing: "border-box",
        textAlign: "center",
        lineHeight: "38px"
    };

    if (currentIndex > 0) {
        const prevLink = sidebarLinks[currentIndex - 1].href;
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = "\u25C0"; // <|
        prevBtn.title = "Previous Problem";
        Object.assign(prevBtn.style, btnStyle);
        prevBtn.addEventListener("click", () => window.location.href = prevLink);
        navContainer.appendChild(prevBtn);
    }

    if (currentIndex < sidebarLinks.length - 1) {
        const nextLink = sidebarLinks[currentIndex + 1].href;
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = "\u25B6"; // |>
        nextBtn.title = "Next Problem";
        Object.assign(nextBtn.style, btnStyle);
        nextBtn.addEventListener("click", () => window.location.href = nextLink);
        navContainer.appendChild(nextBtn);
    }

    if (navContainer.children.length === 0) return;
    document.body.appendChild(navContainer);

    document.addEventListener("mousemove", (e) => {
        const rect = navContainer.getBoundingClientRect();
        if (rect.width === 0) return; 

        const containerX = rect.left + rect.width / 2;
        const containerY = rect.top + rect.height / 2;
        const distance = Math.hypot(e.clientX - containerX, e.clientY - containerY);

        if (distance < 200) {
            navContainer.style.opacity = "1";
            navContainer.style.pointerEvents = "auto";
        } else {
            navContainer.style.opacity = "0";
            navContainer.style.pointerEvents = "none";
        }
    });
};


const createBackToTopButton = () => {
    const btn = document.createElement("button");
    btn.innerHTML = "\u2191" // upwards arrow;
    btn.title = "Back to Top";
    
    Object.assign(btn.style, {
        position: "fixed",
        bottom: "30px",
        right: "30px",
        width: "40px",
        height: "40px",
        backgroundColor: "#e9ecef",
        color: "#000",
        border: "1px solid #000",
        borderRadius: "0",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "none",
        zIndex: "10000",
        transition: "opacity 0.3s ease-in-out",
        padding: "0",
        boxSizing: "border-box",
        textAlign: "center",
        lineHeight: "38px"
    });

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            btn.style.display = "block";
            setTimeout(() => btn.style.opacity = "1", 10);
        } else {
            btn.style.opacity = "0";
            setTimeout(() => {
                if (window.scrollY <= 300) btn.style.display = "none";
            }, 300);
        }
    });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.body.appendChild(btn);
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
    const languages = [
        { code: 'en', label: 'Original (English)' },
        { code: 'vi', label: 'Tiếng Việt (Vietnamese)' },
        { code: 'zh-CN', label: '中文 (Chinese)' },
        { code: 'fr', label: 'Français (French)' },
        { code: 'ru', label: 'Русский (Russian)' }
    ];
    languages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang.code;
        option.innerHTML = lang.label;
        langSelect.appendChild(option);
    });
    langSelect.addEventListener("change", async () => {
        const selectedLang = langSelect.value;
        if (selectedLang === 'en') { location.reload(); return; }
        langSelect.disabled = true;
        const elementsToTranslate = document.querySelector(".content").querySelectorAll("p, li:not(.nav li)");
        for (let el of elementsToTranslate) {
            if (el.closest('.sidebar')) continue;
            if (!el.hasAttribute("data-original-html")) {
                el.setAttribute("data-original-html", el.innerHTML);
            }

            let tempDiv = document.createElement("div");
            tempDiv.innerHTML = el.getAttribute("data-original-html"); 
            let protectedItems = [];

            let specialNodes = tempDiv.querySelectorAll(".math, .MathJax, mjx-container, script[type^='math/tex'], code");
            specialNodes.forEach((node, i) => {
                protectedItems.push(node.outerHTML);
                let placeholder = document.createTextNode(` MTH${i}XXX `);
                node.parentNode.replaceChild(placeholder, node);
            });

            let textToTranslate = tempDiv.innerText;

            if (textToTranslate.trim().length > 0) {
                let translated = await translateText(textToTranslate, selectedLang);
                
                protectedItems.forEach((itemHTML, i) => {
                    let regex = new RegExp(`MTH\\s*${i}\\s*XXX`, "gi");
                    
                    translated = translated.replace(regex, () => itemHTML);
                });
                
                el.innerHTML = translated;
            }

        }
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
    const dividerLine = document.createElement("hr");
    const sectionTitle = document.createElement("h4");
    sectionTitle.style.margin = "0.1em 0 0.5em 0";
    sectionTitle.innerHTML = "Tags";
    const showTags = document.createElement("details");
    const showTagsSummary = document.createElement("summary");
    showTagsSummary.innerHTML = "Show Tags";
    showTagsSummary.style.cursor = "pointer";
    showTags.appendChild(showTagsSummary);
    container.appendChild(dividerLine);
    container.appendChild(sectionTitle);
    container.appendChild(showTags);
    sidebarElement.appendChild(container);
    if (!tagsList || tagsList.length === 0) {
        const noTags = document.createElement("p");
        noTags.innerHTML = "No Tags";
        showTags.appendChild(noTags);
        return;
    }
    const tagsUl = document.createElement("ul");
    tagsUl.style.marginTop = "10px";
    tagsUl.style.padding = "0";
    tagsUl.style.display = "flex";
    tagsUl.style.flexWrap = "wrap";
    tagsUl.style.gap = "6px";
    tagsList.forEach((tag) => {
        const li = document.createElement("li");
        li.textContent = tag;
        li.style.listStyle = "none";
        li.style.backgroundColor = "#f3f4f6";
        li.style.color = "#d63384";
        li.style.padding = "2px 6px";
        li.style.borderRadius = "4px";
        li.style.fontSize = "0.9em";
        li.style.border = "1px solid #d1d5db";
        tagsUl.appendChild(li);
    });
    showTags.appendChild(tagsUl);
}

const createTipsSectionOnSidebar = async () => {
    const sidebarElement = document.querySelector(".nav.sidebar");
    const problemId = getProblemId();
    if (!sidebarElement || !problemId) return;
    const tips = await getTips(problemId);
    const container = document.createElement("div");
    const dividerLine = document.createElement("hr");
    const sectionTitle = document.createElement("h4");
    sectionTitle.innerHTML = "Tips";
    sectionTitle.style.margin = "0.6em 0 0.5em 0";
    const showTips = document.createElement("details");
    const showTipsSummary = document.createElement("summary");
    showTipsSummary.innerHTML = "Show Tips";
    showTipsSummary.style.cursor = "pointer";
    showTips.appendChild(showTipsSummary);
    container.appendChild(dividerLine);
    container.appendChild(sectionTitle);
    container.appendChild(showTips);
    sidebarElement.appendChild(container);
    if (!tips || tips.length === 0) {
        const noTips = document.createElement("p");
        noTips.innerHTML = "No Tips";
        showTips.appendChild(noTips);
        return;
    }
    const ul = document.createElement("ul");
    ul.style.marginTop = "8px";
    tips.forEach((tip) => {
        const li = document.createElement("li");
        li.textContent = tip;
        ul.appendChild(li);
    });
    showTips.appendChild(ul);
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
    languageSelector.addEventListener("change", () => chromeStorage.set({ language: languageSelector.value }));
    languageOption.addEventListener("change", () => chromeStorage.set({ option: languageOption.value }));
}

const submitCodeFile = (fileData) => {
    const problemId = getProblemId();
    if (!problemId) return;
    const formData = new FormData();
    const csrfToken = document.querySelector("input[name='csrf_token']").value;
    formData.append('csrf_token', csrfToken);
    formData.append('task', problemId);
    formData.append('lang', document.getElementById("lang").value);
    const opt = document.getElementById("option");
    if (!opt.disabled) formData.append('option', opt.value);
    formData.append('target', 'problemset');
    formData.append('type', 'course');
    formData.append('file', fileData, 'code.cpp');
    fetch('/course/send.php', { method: 'POST', body: formData }).then((r) => { if (r.ok) location.href = r.url; });
};

const createCodeInputArea = () => {
    const form = document.querySelector("form");
    if (!form) return;
    const codeArea = document.createElement("textarea");
    codeArea.id = "code";
    codeArea.style.width = "100%";
    codeArea.style.height = "300px";
    codeArea.style.marginBottom = "10px";
    codeArea.placeholder = "Paste your code here...";
    
    form.insertBefore(codeArea, form.children[5] || form.firstChild);

    codeArea.focus();
}

const modifySubmitButton = () => {
    const submitBtn = document.querySelector("input[type='submit']");
    if (!submitBtn) return;
    submitBtn.addEventListener("click", (e) => {
        const code = document.getElementById("code")?.value;
        if (!code) {
            const fileInput = document.querySelector("input[type='file']");
            if (fileInput?.files.length > 0) submitCodeFile(fileInput.files[0]);
            return;
        }
        submitCodeFile(new Blob([code], { type: 'text/plain' }));
        e.preventDefault();
    });
}

const formatPreBlocks = () => {
    if (!location.href.includes("/task/")) return;
    document.querySelectorAll(".content pre").forEach((pre) => {
        let labelText = "Data";
        const prev = pre.previousElementSibling;
        if (prev && /^(Input|Output):?$/i.test(prev.innerText.trim())) {
            labelText = prev.innerText.replace(":", "").trim();
            prev.style.display = "none";
        }
        const wrapper = document.createElement("div");
        wrapper.className = "ext-pre-wrapper";
        const header = document.createElement("div");
        header.className = "ext-pre-header";
        const label = document.createElement("span");
        label.textContent = labelText;
        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = "Copy";
        copyBtn.style.cursor = "pointer";
        copyBtn.style.border = "none";
        copyBtn.style.background = "transparent";
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
        pre.style.margin = "0"; pre.style.border = "none"; pre.style.padding = "12px"; pre.style.backgroundColor = "transparent";
    });
}

const setupProblemListsAndStats = () => {
    const headers = document.querySelectorAll("h2");
    if (headers.length === 0) return;

    let globalSolved = 0, globalUntouched = 0;
    const attemptedNotAc = [];
    allProblemsFlat = [];

    headers.forEach((h2, index) => {
        if (index === 0) return;
        if (h2.innerText.includes("General")) {
            h2.style.display = "none";
            if (h2.nextElementSibling?.classList.contains("task-list")) h2.nextElementSibling.style.display = "none";
            return;
        }

        const taskList = h2.nextElementSibling;
        if (!taskList?.classList.contains("task-list")) return;

        const tasks = Array.from(taskList.children);
        let total = tasks.length, ac = 0;

        const originalTitle = h2.childNodes[0].nodeValue ? h2.childNodes[0].nodeValue.trim() : h2.innerText.trim();
        h2.innerText = originalTitle; 
        h2.id = `topic-${index}`;

        const topicData = [];
        tasks.forEach((task, pIdx) => {
            const score = task.querySelector(".task-score");
            const aTag = task.querySelector("a");
            if (score?.classList.contains("full")) { globalSolved++; ac++; }
            else if (score?.classList.contains("zero") || (score && score.className.trim() !== "task-score icon")) {
                attemptedNotAc.push({ title: aTag.innerText, url: aTag.href });
            } else { globalUntouched++; }

            const detail = task.querySelector(".detail");
            const solvers = detail ? parseInt(detail.innerText.split("/")[0].replace(/,/g, '')) || 0 : 0;
            const submissions = detail ? parseInt(detail.innerText.split("/")[1].replace(/,/g, '')) || 1 : 1;
            const acRate = solvers / submissions;
            topicData.push({ defaultIndex: pIdx, solvers, acRate, html: task.outerHTML });
            allProblemsFlat.push({ topic: originalTitle, defaultIndex: pIdx, solvers, acRate, html: task.outerHTML });
        });

        const statsDiv = document.createElement("div");
        statsDiv.className = "ext-topic-stats";
        statsDiv.textContent = `Solved: ${ac}/${total}${ac === total && total > 0 ? ' \u2705' : ''}`; // checkmark
        h2.parentNode.insertBefore(statsDiv, h2.nextSibling);

        const selector = createElementByHTMLtext(`
            <select style="margin-left:10px; font-size: 0.6em; font-weight: normal; vertical-align: middle; cursor: pointer;">
                <option value="default">Sort: Default</option>
                <option value="solvers">Sort: Solvers</option>
                <option value="acRate">Sort: AC Rate</option>
            </select>
        `);

        selector.addEventListener("change", () => {
            taskList.innerHTML = "";
            let sorted = [...topicData];
            if (selector.value === "solvers") sorted.sort((a, b) => b.solvers - a.solvers);
            else if (selector.value === "acRate") sorted.sort((a, b) => b.acRate - a.acRate);
            else sorted.sort((a, b) => a.defaultIndex - b.defaultIndex);
            sorted.forEach(p => taskList.innerHTML += p.html);
        });
        h2.appendChild(selector);
    });

    window.csesExtStats = { total: globalSolved + globalUntouched + attemptedNotAc.length, solved: globalSolved, untouched: globalUntouched, attemptedNotAc };
};

const buildDashboardAndTOC = () => {
    const contentDiv = document.querySelector(".content");
    if (!contentDiv || !window.csesExtStats) return;
    const { total, solved, untouched, attemptedNotAc } = window.csesExtStats;

    const dashboard = document.createElement("details");
    dashboard.className = "ext-container";
    dashboard.open = true;
    const dashSummary = document.createElement("summary");
    dashSummary.className = "ext-summary";
    dashSummary.innerHTML = "Dashboard & Settings";
    dashboard.appendChild(dashSummary);

    const statsText = document.createElement("p");
    statsText.innerHTML = `Total: <strong>${total}</strong> | Solved: <strong style="color:#198754">${solved}</strong> | Untouched: <strong>${untouched}</strong> | Unsolved: <strong style="color:#dc3545">${attemptedNotAc.length}</strong>`;
    dashboard.appendChild(statsText);

    if (attemptedNotAc.length > 0) {
        const det = document.createElement("details");
        const sum = document.createElement("summary");
        sum.innerHTML = "Show unsolved problems";
        sum.style.cursor = "pointer"; sum.style.color = "#dc3545";
        
        const ul = document.createElement("ul");
        attemptedNotAc.forEach(p => { 
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = p.url;
            a.textContent = p.title;
            li.appendChild(a);
            ul.appendChild(li); 
        });
        det.appendChild(sum); det.appendChild(ul);

        dashboard.appendChild(det);
    }

    dashboard.appendChild(document.createElement("hr"));
    const flatLabel = document.createElement("label");
    flatLabel.style.cursor = "pointer";
    const flatCheck = document.createElement("input");
    flatCheck.type = "checkbox";
    flatCheck.style.marginRight = "8px";
    flatLabel.appendChild(flatCheck);
    flatLabel.appendChild(document.createTextNode("Flatten problem list"));
    dashboard.appendChild(flatLabel);

    const globalContainer = document.createElement("div");
    globalContainer.style.display = "none";
    const globalSort = document.createElement("select");
    globalSort.style.margin = "10px 0";
    globalSort.innerHTML = `<option value="default">Sort: Default</option><option value="solvers">Sort: Solvers</option><option value="acRate">Sort: AC Rate</option>`;
    const globalList = document.createElement("ul");
    globalList.className = "task-list";

    const renderGlobal = () => {
        globalList.innerHTML = "";
        let sorted = [...allProblemsFlat];
        if (globalSort.value === "solvers") sorted.sort((a, b) => b.solvers - a.solvers);
        else if (globalSort.value === "acRate") sorted.sort((a, b) => b.acRate - a.acRate);
        sorted.forEach(p => {
            const temp = document.createElement("div");
            temp.innerHTML = p.html;
            const li = temp.firstElementChild;
            const badge = document.createElement("span");
            badge.textContent = p.topic; badge.className = "ext-badge";
            li.querySelector("a")?.appendChild(badge);
            globalList.appendChild(li);
        });
    };

    globalSort.addEventListener("change", renderGlobal);
    globalContainer.appendChild(globalSort);
    globalContainer.appendChild(globalList);
    dashboard.appendChild(globalContainer);

    const toc = document.createElement("details");
    toc.className = "ext-container";
    const tocSum = document.createElement("summary");
    tocSum.className = "ext-summary"; tocSum.innerHTML = "Table of Contents";
    toc.appendChild(tocSum);
    const tocUl = document.createElement("ul");
    tocUl.style.columnCount = "2"; tocUl.style.listStyle = "none"; tocUl.style.padding = "0";
    document.querySelectorAll("h2").forEach(h2 => {
        if (h2.style.display === "none" || h2 === document.querySelectorAll("h2")[0]) return;
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = `#${h2.id}`; 
        a.textContent = h2.innerText.split("Sort:")[0].trim();
        li.appendChild(a); tocUl.appendChild(li);
    });
    toc.appendChild(tocUl);

    const firstH2 = contentDiv.querySelector("h2");
    if (firstH2) { contentDiv.insertBefore(dashboard, firstH2); contentDiv.insertBefore(toc, firstH2); }

    const originalElements = Array.from(document.querySelectorAll("h2, .task-list, .ext-topic-stats")).filter(el => {
        if (el.tagName === "H2" && el === document.querySelectorAll("h2")[0]) return false;
        return el.style.display !== "none" && !dashboard.contains(el);
    });

    flatCheck.addEventListener("change", () => {
        const isChecked = flatCheck.checked;
        originalElements.forEach(el => el.style.display = isChecked ? "none" : "");
        toc.style.display = isChecked ? "none" : "";
        globalContainer.style.display = isChecked ? "block" : "none";
        if (isChecked) renderGlobal();
    });
}

function addCopyToClipboardButton() {
    const preElement = document.querySelector("pre.prettyprint") || document.querySelector(".content pre");
    if (!preElement) return;

    let actionBar = document.querySelector(".content .nav");

    if (actionBar) {
        const btn = createElementByHTMLtext(`
            <li style="cursor: pointer;">
                <a>Copy to clipboard</a>
            </li>
        `);

        btn.addEventListener("click", () => {
            navigator.clipboard.writeText(preElement.innerText);
            const aTag = btn.querySelector("a");
            aTag.innerHTML = "Copied! :)";
            setTimeout(() => { aTag.innerHTML = "Copy to clipboard"; }, 1000);
        });

        actionBar.appendChild(btn);
        actionBar.style.marginBottom = "10px";
        preElement.parentNode.insertBefore(actionBar, preElement);
    } else {
        const copyBar = document.createElement("div");
        copyBar.style.display = "flex";
        copyBar.style.justifyContent = "flex-end";
        copyBar.style.marginBottom = "8px";
        copyBar.style.fontFamily = "sans-serif";
        copyBar.style.fontSize = "0.9em";

        const btn = document.createElement("a");
        btn.innerHTML = "Copy to clipboard";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.style.color = "#0066cc";

        btn.addEventListener("click", () => {
            navigator.clipboard.writeText(preElement.innerText);
            btn.innerHTML = "Copied! :)";
            setTimeout(() => { btn.innerHTML = "Copy to clipboard"; }, 1000);
        });

        copyBar.appendChild(btn);
        preElement.parentNode.insertBefore(copyBar, preElement);
    }
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

const isProblemListPage = () => [
    "https://cses.fi/problemset/list/",
    "https://cses.fi/problemset/list",
    "https://cses.fi/problemset/",
    "https://cses.fi/problemset"
].includes(location.href);

const initExtension = () => {
    injectStyles();

    createBackToTopButton();
    addSubmitHotkey();
    addProblemNavigation();

    const url = location.href;
    if (url.includes("/submit")) { loadLanguageSelectorCache(); createLanguageSelectorCache(); createCodeInputArea(); modifySubmitButton(); }
    if (url.includes("/task/") || url.includes("/view/") || url.includes("/stats/")) {
        formatPreBlocks(); createTranslationSectionOnSidebar(); createTagsSectionOnSidebar().then(() => createTipsSectionOnSidebar());
    }
    if (url.endsWith("/problemset/") || url.endsWith("/problemset") || url.includes("/list")) {
        setupProblemListsAndStats(); buildDashboardAndTOC();
    }
    if (url.includes("/result/") || url.includes("/paste/")) {
        addCopyToClipboardButton();
    }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initExtension); else initExtension();