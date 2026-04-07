if (typeof browser === "undefined") var browser = chrome;

const getJSON = (path) =>
    fetch(path)
        .then(response => response.json());

const getTags = (problemId) =>
    getJSON("../database/tags.json")
        .then(tagsData => tagsData[problemId]);

const getTips = (problemId) =>
    getJSON("../database/tips.json")
        .then(tipsData => tipsData[problemId]);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "fetch-tags") {
        getTags(request.problemId).then((tags) => {
            sendResponse({
                tags: tags ?? []
            });
        });
    } else if (request.command === "fetch-tips") {
        getTips(request.problemId).then((tips) => {
            sendResponse({
                tips: tips ?? []
            });
        });
    }
    return true;
});
