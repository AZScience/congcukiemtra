let studentDetails = new Map();
let totalClassDuration = 0;
let totalActiveDuration = 0;
let startTime = new Date().toLocaleTimeString();
let startTimeInMillis = new Date().getTime();
let currentMeetingName = null;
let goingToStop = 0;
let isAttendanceWorking = false;
let previousRecordBackup = 0;
let wasAlreadyAlerted = false;
let canShowProfileIconForReports = false;
let isCustomMeetingName = false;
const EXTENSION_MANIFEST_VERSION = "3.0";
let canSendReportMetricsForCurrentReport = true;
let extensionHealth = {};
let reportMetrics = null;
setDefaultReportMetrics();
let documentBody = null;
let lastUISnapSavedTime = null;
let allTimeMaxUserCountFromTiles = -1;
let allTimeMaxUserCountShownInUI = -1;

//setInterval breakers
let startAttendanceTracker = null;
let checkBtnPrediocally = null;
let checkIsInMeeting = null;

// Performance tracking variables
let timeTakenToOpenParticipantsTab = -1;
let attendanceReportStartTime = new Date().getTime();

// Constants
const RECORD_BACKUP_THRESHOLD = 8; // Every 8 seconds once the report will be saved in localstorage

const LOCAL_KEY_PREVIOUS_REPORT = "googlemeet-attendance-tracker-ext-previous-meeting-data";

const PROD_URL = 'https://meet-attendance-tracker.web.app';
const PRE_URL = 'https://pre-meet-attendance-trac-cc9eb.web.app';
const SAVE_ATTENDANCE_URI = '/saveattendance.html';
const CONTACTUS_URL = '/contactus.html';
const PROD_SAVE_ATTENDANCE_URL = PROD_URL+SAVE_ATTENDANCE_URI;
const PRE_SAVE_ATTENDANCE_URL = PRE_URL+SAVE_ATTENDANCE_URI;
const PRE_CONTACTUS_URL = PRE_URL+CONTACTUS_URL;
const PROD_CONTACTUS_URL = PROD_URL+CONTACTUS_URL;

const DEV_MODE = false;

// Update this variable to clear the saveattendance.html cache in users browser
const EXTENSION_VERSION = "V3"; 

//Google Meet UI HTML class names
let CONTRIBUTORS_ELEMENT="m3Uzve RJRKn";

let DATA_MEETING_TITLE_ATTR = "data-meeting-title";
let DATA_PARTICIPANT_ID_ATTR = "data-participant-id";

// Participants BTN selectors
let DEFAULT_PARTICIPANTS_BTN_SELECTOR = `[data-side="1"] [role="button"]`;
let FALLBACK_PARTICIPANTS_BTN_SELECTOR = `[role="button"]`;
let OLD_UI_PARTICIPANTS_BTN_SELECTOR = `[data-panel-id][role="button"]`; // participants button in the bottom right panel

// Participants NAME selectors
let DEFAULT_PARTICIPANTS_NAME_SELECTOR = `[role="listitem"][data-participant-id]`;
let FALLBACK_PARTICIPANTS_NAME_SELECTOR = `[data-participant-id]:not([role="listitem"])`;

// Participants IMAGE selector
let PARTICIPANT_IMAGE_SELECTOR = `img[src^="https://lh3.googleusercontent.com"]`;

const DEFAULT_PROFILE_ICON = PROD_URL+'/svg/default-person-icon.svg';



function setDefaultMessageListener(event) {
    try{
        if (!isValidMessageListenerCall(event)) {
            return;
        }
        if (canProcessEvent(event)) {
            let eventData = JSON.parse(event.data);
            if (eventData.hasOwnProperty("action")) {
                let eventAction = eventData.action;
                console.log(eventAction);
                if(eventAction) {
                    if(eventAction == "sendPreviousReport") {
                        let attendanceReport = getPreviousReportData();
                        if (attendanceReport!=null) {
                            event.source.postMessage(JSON.stringify(attendanceReport), event.origin);
                        }
                    } else if(eventAction == "sendCurrentReport") {
                        let attendanceReport = getReportWithCurrentData();
                        if (attendanceReport!=null) {
                            event.source.postMessage(JSON.stringify(attendanceReport), event.origin);
                        }
                    } else if(eventAction == "removePreviousReport") {
                        localStorage.removeItem(LOCAL_KEY_PREVIOUS_REPORT);
                    } else if(eventAction == "sendExtensionHealth") {
                        if (canSendReportMetricsForCurrentReport) {
                            canSendReportMetricsForCurrentReport = false;
                            saveReportMetrics();
                            let extensionHealthResp = { extensionManifestVersion: EXTENSION_MANIFEST_VERSION, extensionHealthJsonMat: extensionHealth, reportMetricsJsonMat: reportMetrics }
                            if (documentBody != null) {
                                extensionHealthResp.meetUIDocBody = documentBody;
                            }
                            if (extensionHealthResp != null && typeof (extensionHealthResp) == 'object') {
                                event.source.postMessage(JSON.stringify(extensionHealthResp), event.origin);
                            }
                        } else {
                            console.log("Already sent the health report for current meeting report");
                        }
                    }
                }
            }
        }
    }catch(e){
        console.log("Unable to set message listenr by MAT: "+e);
    }
}

window.addEventListener("message", setDefaultMessageListener);

window.onload = function() {
    if(checkIsInMeeting) {
        return;
    }
    checkIsInMeeting = setInterval(hasUserJoinedMeeting, 1000);
}

function hasUserJoinedMeeting() {
    try{
        if(isInMeeting()) {
            clearInterval(checkIsInMeeting);
            checkIsInMeeting = null;
            startExtension();
        }
    }catch(e){
        console.log("Exception in hasUserJoinedMeeting "+e);
    }
}

function startExtension() {
    try{
        setTimeout(function(){
            addTrackAttendanceButton();
        }, 700);
    }catch(e){
        console.log("Exception in startExtension "+e);
    }
}

function addTrackAttendanceButton() {
    try{
        setTimeout(function () {
            let trackAttBtnEle = document.getElementById("trackAttendanceRedButton_GMAT");
            if (trackAttBtnEle == null) {
               const trackAttendanceBtnHTML = ` <div style="position:fixed; top:6px; left:50%; transform:translateX(-50%); z-index:2147483647;"> <style> @keyframes gmatWhitePulse { 0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); } 70%  { box-shadow: 0 0 0 44px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } } #trackAttendanceRedButton_GMAT.pulse { animation: gmatWhitePulse 3.2s ease-out 2; } </style> <button id="trackAttendanceRedButton_GMAT" type="button" class="pulse" style=" background-color:#C5221F; color:white; border:1px solid white; border-radius:999px; height:56px; padding:0 28px; font-size:17px; font-weight:600; letter-spacing:0.2px; display:none; align-items:center; justify-content:center; gap:10px; cursor:pointer; "> ▶ &nbsp; Track Attendance </button> </div>`; 
               document.body.insertAdjacentHTML("beforeend", trackAttendanceBtnHTML);
                attachClickListenerForNewButton();
                showTrackAttendanceButton();
                keepCheckingForButtonExistencePeriodically();
                if (isPreviousReportPresent()) {
                    proceedSavingPreviousReport(true);
                }
            }
        }, 1100);
    }catch(e){
        console.log("Exception while trying to addTrackAttendanceButton"+e);
    }
}

//Check if all variables are global in this function
function attachClickListenerForNewButton() {
    try {
        document.getElementById('trackAttendanceRedButton_GMAT').addEventListener('click', async function () {

            if (!isAttendanceWorking) {
                if (isPreviousReportPresent()) {
                    proceedSavingPreviousReport(true);
                } else {
                    // 1. Set Global variables
                    isAttendanceWorking = true;
                    updateTrackAttendanceButtonToTrackingMode();
                    resetGlobalVariablesForNewReport();
                    // 2. Try to open the participants tab
                    let perfTrackParticiTab = new Date().getTime();
                    let wasParticipantsTabOpeningSuccessful = await tryToOpenParticipantsTab();
                    if(timeTakenToOpenParticipantsTab==-1 && wasParticipantsTabOpeningSuccessful) {
                        timeTakenToOpenParticipantsTab = Math.ceil((new Date().getTime() - perfTrackParticiTab)/1000);
                    }
                    // 3. Start attendance tracking if data is fetchable after trying to open participants tab else show a popup
                    if((getParticipantsInformationFromParticipantsTab().size > 0) || (getParticipantsInformationFromTiles().size > 0)) {
                        if(isAttendanceWorking) { // When track attendance is double clicked fast report would have stopped but after the await attendance tracking will start...So checking before starting
                            start();
                        }
                    } else {
                        stopAttendance(false);
                        showCantTrackNowButYouCanRecoverBanner("cantOpenParticipantsTab");
                    }
                }
            } else if (isAttendanceWorking) {
                saveExtensionHealth();
                reportMetrics["GENERAL_Report generated with stop button"] = 1;
                stopAttendance(true);
            }
        });

    } catch (e) {
        console.log(e);
        console.log("Can't attach click listener for the new button");
    }
}

function proceedSavingPreviousReport(isAlertPopupRequired=true) {
    try {
        if (isAlertPopupRequired) {
            alert("Unsaved previously tracked attendance report found!\nOn clicking \"OK\" It will be recovered now.");
        }
        let previousReport = getPreviousReportData();
        if (previousReport != null) {
            openSaveAttendancePage(true);
        } else {
            console.log("Point 7");
            showContactUsAlert(true, "previousreportdatanotfound");
        }
    } catch (er) {
        console.log("Error inside: proceedSavingPreviousReport");
    }
}

async function tryToOpenParticipantsTab() {
    try{
        if(isParticipantsTabOpened()) {
            return true;
        }
        // Case 1: For new UI Google Meet users with participants button in the top right
        let primaryContainer = document.body.querySelectorAll(DEFAULT_PARTICIPANTS_BTN_SELECTOR);
        let filteredButtons = getButtonsUnderGoogleImgOrWithNumber(primaryContainer);
        if(filteredButtons.length > 0) {
            for(let i=0;i<filteredButtons.length;i++) {
                try{
                    filteredButtons[i].click();
                    await wait(1000);
                    if(isParticipantsTabOpened()) {
                        return true;
                    }
                }catch(e){
                }
            }
        }
        // Case 1.1: For new UI Google Meet users with participants button in the top right (Fallback for case 1, because sometimes google might remove or rename data-side="1" attribute)
        primaryContainer = document.body.querySelectorAll(FALLBACK_PARTICIPANTS_BTN_SELECTOR);
        filteredButtons = getButtonsUnderGoogleImgOrWithNumber(primaryContainer);
        if(filteredButtons.length > 0) {
            for(let i=0;i<filteredButtons.length;i++) {
                try{
                    filteredButtons[i].click();
                    await wait(1000);
                    if(isParticipantsTabOpened()) {
                        return true;
                    }
                }catch(e){
                }
            }
        }
        // Case 2: For old UI Google Meet users with participants button in the bottom right panel
        filteredButtons = document.body.querySelectorAll(OLD_UI_PARTICIPANTS_BTN_SELECTOR);
        if(filteredButtons.length > 0) {
            for(let i=0;i<filteredButtons.length;i++) {
                try{
                    filteredButtons[i].click();
                    await wait(1000);
                    if(isParticipantsTabOpened()) {
                        reportMetrics["GENERAL_Participants tab opened for old UI_INFO"] = 1;
                        return true;
                    }
                }catch(e){
                }
            }
        }
        for(let i=0;i<6;i++) {
            await wait(1000);
            if(isParticipantsTabOpened()) {
                return true;
            }
        }
        // Open a popup and ask user to manually open the participants-tab (if required in future)
    }catch(e){
        console.log("Exception inside tryToOpenParticipantsTab: "+e);
    }
    return false;
}

function start() {
    try{
        if (startAttendanceTracker) {
            clearInterval(startAttendanceTracker); // Kill any existing ghost trackers
            startAttendanceTracker = null;
        }
        startTime = new Date().toLocaleTimeString(); // Used in report data
        attendanceReportStartTime = new Date().getTime(); // For performance tracking
        startAttendanceTracker = setInterval(attendanceTracker, 1000);
    }catch(e){
        console.log("Exception insdie start func: "+e);
    }
}

function attendanceTracker() {
    try {
        allTimeMaxUserCountShownInUI = Math.max(allTimeMaxUserCountShownInUI, getParticipantsCountInMeeting());
        let currentParticipantsInMeeting = null;
        if(isParticipantsTabOpened()) {
            currentParticipantsInMeeting = getParticipantsInformationFromParticipantsTab();
        } else {
            currentParticipantsInMeeting = getParticipantsInformationFromTiles();
            if(isUserInMeetingView()) { // We do this for accurate stats...as when meet is ended with call end button..and if the attendance tracke's last one second executes...then the below stats are added and messed
                saveMeetUISnapShot();
                reportMetrics["GENERAL_Participant names fetch from tiles_DANGER"] = 1;
                allTimeMaxUserCountFromTiles = Math.max(allTimeMaxUserCountFromTiles, currentParticipantsInMeeting.size);
                console.log("Participant names are used from tiles");
            }
        }
        if (currentParticipantsInMeeting!=null && currentParticipantsInMeeting.size > 0) {
            markAttendanceForGivenParticipants(currentParticipantsInMeeting);
        } else {
            goingToStop += 1;
            if(goingToStop == 2) {
                if(!isUserInMeetingView() && totalClassDuration > 0) {
                    reportMetrics["GENERAL_Report generated with meet end call button"] = 1;
                    stopAttendance(true);
                } else {
                    saveMeetUISnapShot();
                    if(totalClassDuration > 0) {
                        reportMetrics["GENERAL_Tracking stopped abruptly_DANGER"] = 1;
                        stopAttendance(true);
                    } else {
                        showCantTrackNowButYouCanRecoverBanner("stoppedAbruptly");
                        stopAttendance(false);
                    }
                }
            }
        }
    } catch (e) {
        console.log("Error inside attendanceTracker function: " + e);
    }
}

function markAttendanceForGivenParticipants(currentParticipants) {
    try {
        let studentNameKeys = currentParticipants.keys();
        for (let index = 0; index < currentParticipants.size; index++) {
            let studentName = studentNameKeys.next().value;
            let studentPropertiesData = currentParticipants.get(studentName);
            let studentProfileIcon = studentPropertiesData.profileIcon;
            if (studentDetails.has(studentName)) {
                let data = studentDetails.get(studentName);
                let currStudentProfileIcon = data[2];
                // This is a temp code when giving support to track 2 people with same name we should handle this
                if (studentProfileIcon == currStudentProfileIcon) {
                    data[0] += 1;
                    studentDetails.set(studentName, data);
                } else {
                    data[0] += 1;
                    studentDetails.set(studentName, data);
                }
            }
            else {
                let joiningTime = new Date().toLocaleTimeString();
                let currStatus = 1;
                let data = [];
                data.push(currStatus);
                data.push(joiningTime);
                data.push(studentProfileIcon);
                studentDetails.set(studentName, data);
            }
        }
        updateTrackAttendanceButtonContent("Tracking Attendance for " + toTimeFormat(totalClassDuration) + "<br>" + "Click To Generate Report");
        totalClassDuration += 1;
        goingToStop = 0;
        previousRecordBackup += 1;
        if (document.visibilityState == 'visible') {
            totalActiveDuration += 1;
        }
        if (previousRecordBackup == 2 || previousRecordBackup % RECORD_BACKUP_THRESHOLD == 0) {
            saveCurrentReportToLocalStorage();
            if(previousRecordBackup == 2) {
                saveExtensionHealth();
            }
        }
    } catch (e) {
        console.log("Exception inside markAttendanceForGivenParticipants " + e);
    }
}

function saveCurrentReportToLocalStorage() {
    try{
        let currentReportData = getReportWithCurrentData();
        if (currentReportData != null) {
            localStorage.setItem(LOCAL_KEY_PREVIOUS_REPORT, JSON.stringify(currentReportData));
        }
    }catch(e){
        console.log("Exception while trying to save current report in localstorage: "+e);
    }
}

function stopAttendance(canGenerateReport=true) {
    try {
        clearInterval(startAttendanceTracker);
        startAttendanceTracker = null;
        resetTrackAttendanceButton();
        if (canGenerateReport) {
            let newRecord = getReportWithCurrentData();
            if (newRecord != null) {
                openSaveAttendancePage(false);
            } else {
                console.log("Point 1");
                showContactUsAlert(true, "failedAtStopAttendance");
            }
        }
    } catch (e) {
        console.log("Exception inside stopAttendance: " + e);
    }
}

function getReportWithCurrentData() {
    try {
        let meetingCode = getMeetingCode();
        let date = new Date();
        let dd = date.getDate();
        let mm = date.toLocaleString('default', { month: 'short' })
        let yyyy = date.getFullYear();
        date = dd + "-" + mm + "-" + yyyy;
        let sortedtstudentsNameSet = [];
        let studentsAttendedDuration = [];
        let studentsJoiningTime = [];
        let studentsProfileIcon = [];
        let mapKeys = studentDetails.keys();
        for (let i = 0; i < studentDetails.size; i++) {
            let studentName = mapKeys.next().value;
            sortedtstudentsNameSet.push(studentName);
        }
        sortedtstudentsNameSet.sort();
        for (let studentName of sortedtstudentsNameSet) {
            let data = studentDetails.get(studentName);
            studentsAttendedDuration.push(data[0]);
            studentsJoiningTime.push(data[1]);
            studentsProfileIcon.push(data[2]);
        }
        let newRecord = {
            meetingCode: meetingCode,
            date: date,
            attendanceStartTime: startTime,
            attendanceStopTime: new Date().toLocaleTimeString(),
            studentNames: sortedtstudentsNameSet,
            attendedDuration: studentsAttendedDuration,
            joiningTime: studentsJoiningTime,
            profileIcons: studentsProfileIcon,
            customDefinitions: [canShowProfileIconForReports, isCustomMeetingName],
            meetingDuration: totalClassDuration,
            totalActiveTimeInMeet: totalActiveDuration,
            metaForAPI: getCurrentMeetingMetaData()
        }
        if(isCustomMeetingName && currentMeetingName!=null) {
            newRecord.meetingName = currentMeetingName;
        }
        return newRecord;
    } catch (err) {
        console.log("error while creating current report: "+err);
        console.log("Point 6");
        showContactUsAlert(true, "agentbreakage");
    }
    return null;
}


function openSaveAttendancePage(isPreviousReport) {
    try {
        let saveAttendanceURL = getSaveAttendanceURL();
        if (isPreviousReport) {
            saveAttendanceURL += "?isPreviousReport=true&version="+EXTENSION_VERSION;
        } else {
            saveAttendanceURL += "?isPreviousReport=false&version="+EXTENSION_VERSION;
        }
        window.open(saveAttendanceURL, '_blank', 'opener');
    } catch (error) {
        console.log("Unable to execute openSaveAttendancePage: "+error);
    }
}

function getParticipantsInformationFromParticipantsTab() {
    // Think if we can solve multiple user same name problem
    let participantsInfo = new Map();
    try {
        let contributorDocumentToUse = getContributorsDocumentToFetchParticipantsName();
        let eleToUse = contributorDocumentToUse != null && contributorDocumentToUse &&contributorDocumentToUse.querySelectorAll(DEFAULT_PARTICIPANTS_NAME_SELECTOR).length > 0 ? contributorDocumentToUse : document.body;
        let participantsEle = eleToUse.querySelectorAll(DEFAULT_PARTICIPANTS_NAME_SELECTOR);
        participantsEle.forEach(el => {
            try{
                const name = el.getAttribute('aria-label')?.trim() || el.querySelector('span')?.textContent?.trim() || null;
                const imgEl = el.querySelector(PARTICIPANT_IMAGE_SELECTOR);
                const imageUrl = imgEl?.src || DEFAULT_PROFILE_ICON;
                if (name != null && name.length>0) {
                    const userProperties = {
                        "profileIcon": imageUrl
                    };
                    if(!canShowProfileIconForReports && !imageUrl.includes(DEFAULT_PROFILE_ICON)) {
                        canShowProfileIconForReports = true;
                    }
                    participantsInfo.set(name.toUpperCase(), userProperties);
                }
            }catch(e){
                console.log("Error while iterating participant name from tab: "+e);
            }
        });
    } catch (e) {
        console.log("Error inside getParticipantsInformationFromParticipantsTab: " + e);
    }
    return participantsInfo;
}

function getParticipantsInformationFromTiles() {
    let participantsInfo = new Map();
    try{
        let participantsEle = document.body.querySelectorAll(FALLBACK_PARTICIPANTS_NAME_SELECTOR);
        participantsEle.forEach(el => {
            try{
                const name = el.querySelector('span.notranslate')?.textContent?.trim() || null;
                const imgEl = el.querySelector(PARTICIPANT_IMAGE_SELECTOR);
                const imageUrl = imgEl?.src || DEFAULT_PROFILE_ICON;
                if (name != null && name.length>0) {
                    const userProperties = {
                        "profileIcon": imageUrl
                    };
                    if(!canShowProfileIconForReports && !imageUrl.includes(DEFAULT_PROFILE_ICON)) {
                        canShowProfileIconForReports = true;
                    }
                    participantsInfo.set(name.toUpperCase(), userProperties);
                }
            }catch(e){
                console.log("Exception while iterating the dom element: "+e);
            }
        });
    }catch(e){
        console.log("Exception inside getParticipantsInformationFromTiles: "+e);
    }
    return participantsInfo;
}

function isParticipantsTabOpened() {
    try{
        let participantEle = document.body.querySelectorAll(DEFAULT_PARTICIPANTS_NAME_SELECTOR);
        if(participantEle.length > 0) {
            reportMetrics["GENERAL_Participants tab opened_INFO"] =  1;
            return true;
        }
    }catch(e){
        console.log("Exception inside isParticipantsTabOpened: "+e);
    }
    return false;
}

function isTestingEnv() {
    try {
        return DEV_MODE ? true : false;
    } catch (error) {
    }
    return false;
}

function getProductURL() {
    try {
        let isTesting = isTestingEnv();
        if (isTesting) {
            return PRE_URL;
        } else {
            return PROD_URL;
        }
    } catch (error) {
    }
    return PROD_URL;
}

function getSaveAttendanceURL() {
    try {
        let isTesting = isTestingEnv();
        if (isTesting) {
            return PRE_SAVE_ATTENDANCE_URL;
        } else {
            return PROD_SAVE_ATTENDANCE_URL;
        }
    } catch (err) {
    }
    return PROD_SAVE_ATTENDANCE_URL;
}

function getContactUsURL() {
    try {
        let isTesting = isTestingEnv();
        if (isTesting) {
            return PRE_CONTACTUS_URL;
        } else {
            return PROD_CONTACTUS_URL;
        }
    } catch (e) {
    }
    return PROD_CONTACTUS_URL;
}

function getButtonsUnderGoogleImgOrWithNumber(buttonElements) {
    // Check if one image is alone enough and think if we can have count checks also
    let firstPreferenceBtns = [];
    let googleIconHavingBtns = [];
    let numberHavingBtns = [];
    let numberOnlyBtns = [];
    try{
        for(const btn of buttonElements) {
            try{
                if (btn && btn != null) {
                    const btnHasGoogleImg = btn.querySelector('img[src*="googleusercontent"]');
                    const btnHasAnNumber = /\d+/.test(btn.innerText.trim());
                    const btnHasOnlyNumber = /^\d+\+?$/.test(btn.innerText.trim());
                    if(btnHasGoogleImg && btnHasAnNumber) {
                        firstPreferenceBtns.push(btn);
                    } else if(btnHasGoogleImg) {
                        googleIconHavingBtns.push(btn);
                    } else if(btnHasOnlyNumber) {
                        numberOnlyBtns.push(btn);
                    } else if(btnHasAnNumber) {
                        numberHavingBtns.push(btn);
                    }
                }
            }catch(e){
            }
        }
    }catch(e){
        console.log("Exception inside getButtonsUnderGoogleImgOrWithNumber: "+ e);
    }
    let finalArray = [...firstPreferenceBtns, ...googleIconHavingBtns, ...numberOnlyBtns, ...numberHavingBtns];
    console.log("Possible participants btn from UI: ");
    console.log(finalArray);
    return finalArray;
}

function getParticipantsCountInMeeting() {
    try{
        let countEle = document.getElementsByClassName("egzc7c");
        if(countEle.length == 0) {
            countEle = document.getElementsByClassName("uGOf1d");
        }
        if(countEle.length >= 1) {
            for(let i=0;i<countEle.length;i++) {
                try{
                    let value = Number(countEle[i].innerText);
                    if(!isNaN(value) && value >= 1 && isFinite(value)) {
                        return value;
                    }
                }catch(e){
                }
            }
        }
    }catch(e){
        console.log("Exception inside getParticipantsCountInMeeting: "+e);
    }
    return -1;
}

function getContributorsDocumentToFetchParticipantsName() {
    try{
        let contributorsDocument = document.getElementsByClassName(CONTRIBUTORS_ELEMENT);
        let contributorsDocumentLength = contributorsDocument.length;
        if(contributorsDocumentLength == 1) {
            return contributorsDocument[0];
        } else if(contributorsDocumentLength>1) { // Strictly if there are only multiple contributors element then pick the element which has participants name
            try{
                for(let i=0;i<contributorsDocumentLength;i++) {
                    let participantsCount = contributorsDocument[i].querySelectorAll(DEFAULT_PARTICIPANTS_NAME_SELECTOR).length;
                    if(participantsCount > 0) {
                        return contributorsDocument[i];
                    }
                }
            }catch(e){
                console.log("Exception while trying to find the best contributors tab");
            }
        }
    }catch(e){
        console.log("Exception inside getContributorsDocumentToFetchParticipantsName: "+e);
    }
    return null;
}

function checkIfButtoncanBeShown() {
    try {
        let btnElement = document.getElementById("trackAttendanceRedButton_GMAT");
        if(btnElement != null) {
            if(isUserInMeetingView()) {
                showTrackAttendanceButton();
            }else {
                hideTrackAttendanceButton();
            }
        }
    } catch (ex) {
        console.log("Error while checking if the button is present: "+ex);
    }
}

function isPreviousReportPresent() {
    try {
        return getPreviousReportData() != null ? true : false;
    } catch (er) {
        console.log("Error while checking if any previous report is present (or) not: "+er);
    }
    return false;
}

function getPreviousReportData() {
    try {
        let previousReportData = null;
        try{previousReportData = localStorage.getItem(LOCAL_KEY_PREVIOUS_REPORT);}catch(e){}
        if (previousReportData != null && typeof (previousReportData) == "string" && previousReportData != "" && previousReportData != "[]" && previousReportData.length > 2 && isJSON(previousReportData)) {
            let previousReport = JSON.parse(previousReportData);
            return previousReport;
        }
    } catch (err) {
        console.log("Error while getting previous report data from localstorage: "+err);
    }
    return null;
}

function updateTrackAttendanceButtonContent(buttonText) {
    try{
        let trackAttendanceButton = document.getElementById("trackAttendanceRedButton_GMAT");
        if(trackAttendanceButton!=null && trackAttendanceButton) {
            trackAttendanceButton.innerHTML = buttonText;
        }
    }catch(e){
    }
}

function updateTrackAttendanceButtonToTrackingMode() {
    try{
        let trackAttendanceButton = document.getElementById("trackAttendanceRedButton_GMAT");
        if(trackAttendanceButton!=null && trackAttendanceButton) {
            trackAttendanceButton.innerHTML = "Starting...Please wait";
            trackAttendanceButton.style.border = "1px solid white";
            trackAttendanceButton.style.backgroundColor = "#00796b";
        }
    }catch(e){
    }
}

function resetGlobalVariablesForNewReport() {
    try{
        startTime = new Date().toLocaleTimeString();
        isCustomMeetingName = false;
        canShowProfileIconForReports = false;
        currentMeetingName = getCurrentMeetingName();
        studentDetails.clear();
        totalClassDuration = 0;
        totalActiveDuration = 0;
        previousRecordBackup = 0;
        goingToStop = 0;
        extensionHealth = {};
        canSendReportMetricsForCurrentReport = true;
        setDefaultReportMetrics();
        // used for stats and health global variables
        lastUISnapSavedTime = null;
        documentBody = null;
        allTimeMaxUserCountShownInUI = -1;
        allTimeMaxUserCountFromTiles = -1;
    }catch(e){
        console.log("Exception inside resetGlobalVariablesForNewReport: "+e);
    }
}

function resetTrackAttendanceButtonToDefault() {
    try {
        let trackAttendanceButton = document.getElementById("trackAttendanceRedButton_GMAT");
        if (trackAttendanceButton != null && trackAttendanceButton) {
            trackAttendanceButton.innerHTML = "▶ &nbsp; Track Attendance";
            trackAttendanceButton.style.border = "1px solid white";
            trackAttendanceButton.style.backgroundColor = "#C5221F";
        }
    } catch (e) {
    }
}

function keepCheckingForButtonExistencePeriodically() {
    try {
        if(checkBtnPrediocally) {
            return;
        }
        checkBtnPrediocally = setInterval(function () {
            checkIfButtoncanBeShown();
        }, 1000);
    } catch (exce) {
        console.log("Error while adding button existence checking function");
    }
}

function isInMeeting() { 
    try{
        let pathName = location.pathname;
        if(pathName!=="/" && pathName.length > 1) {
            if(isUserInMeetingView()) {
                return true;
            }
        }
    }catch(e){
    }
    return false;
}

function isUserInMeetingView() {
    try{
        if(hasAttribute(DATA_PARTICIPANT_ID_ATTR) && hasAttribute(DATA_MEETING_TITLE_ATTR)) {
            return true;
        } else if(getAttributeLen(DATA_PARTICIPANT_ID_ATTR)>1) { // When you are waiting for host to approve the DATA_PARTICIPANT_ID_ATTR will be 1 but you can't track attendance in that case..hence checking > 1
            return true;
        } else if(hasAttribute(DATA_MEETING_TITLE_ATTR) && getParticipantsCountInMeeting() > 0) { // Companion mode users
            return true;
        }
    }catch(e){
        console.log("Exception inside isUserInMeetingView: "+e);
    }
    return false;
}

function showCantTrackNowButYouCanRecoverBanner(reason) {
    try{
        let bannerTitle = "Meet Attendance Tracker";
        let errorCode = reason == "stoppedAbruptly" ? "ATTENDANCE_TRACKING_FAILED" : "CANNOT_START_ATTENDANCE";
        let bannerContent = `<span style="margin-top: 13px;"><b>Error: </b> <span style="color: #fc0000;">${errorCode}</span></span> <p style="margin-top:20px; font-size: 15px;"> Don't worry - <span style="color: #000000;">You can still get attendance report for this meeting.</span></p>`;
        let buttonContent = "Get Attendance Report";
        let buttonActionCallBack = function() {
            let recoverReportURL = getProductURL() + "/myreports.html?actionToDo=recoverTodaysMeetings&reason="+reason;
            window.open(recoverReportURL);
        }
        showBanner(bannerTitle, bannerContent, buttonContent, buttonActionCallBack);
    }catch(e){
    }
}

function hideTrackAttendanceButton() {
    try{
        let trackAttendanceBtn = document.getElementById('trackAttendanceRedButton_GMAT');
        if(trackAttendanceBtn!=null) {
            trackAttendanceBtn.style.display = "none";
        }
    }catch(e){
        console.log("Exception while trying to hide track attendance button "+e);
    }
}

function showTrackAttendanceButton() {
    try{
        let trackAttendanceBtn = document.getElementById('trackAttendanceRedButton_GMAT');
        if(trackAttendanceBtn!=null) {
            trackAttendanceBtn.style.display = "flex";
        }
    }catch(e){
        console.log("Exception while trying to show track attendance button "+e);
    }
}

function resetTrackAttendanceButton() {
    try{
        isAttendanceWorking = false;
        resetTrackAttendanceButtonToDefault();
        goingToStop = 0;

    }catch(e){
        console.log("Exception inside resetTrackAttendanceButton: "+e);
    }
}

function getCurrentMeetingName() {
    try{
        if(hasAttribute(DATA_MEETING_TITLE_ATTR)) {
            let attributeNodes = getAttributeElements(DATA_MEETING_TITLE_ATTR);
            if(attributeNodes!=null && attributeNodes.length > 0) {
                let meetingNameNode = attributeNodes[0];
                let meetingName = meetingNameNode.innerText;
                if(meetingName.includes("\n")) {
                    meetingName = meetingName.split('\n')[0].trim();
                    if(meetingName.length > 0) {
                        isCustomMeetingName = getMeetingCode() === meetingName ? false : true;
                        return meetingName;
                    }
                }
            }
        }
    }catch(e){
        console.log("Exception inside getCurrentMeetingName: "+e);
    }
    return null;
}

// We can use this data for rest-filters in future.
function getCurrentMeetingMetaData() {
    let metaData = {};
    try{
        metaData.meetingStartTimeInMillis = startTimeInMillis;
        metaData.meetingCode = getMeetingCode();
        //If participants names are not fetched from tiles properly then add "isParticipantsInfoIncomplete"
        if(allTimeMaxUserCountFromTiles!=-1 && allTimeMaxUserCountShownInUI!=-1) {
            if(allTimeMaxUserCountFromTiles > 0 && allTimeMaxUserCountFromTiles==allTimeMaxUserCountShownInUI && allTimeMaxUserCountShownInUI==studentDetails.size) {
                reportMetrics["GENERAL_Report Generated (accurately) with names fully fetched from tiles_WARNING"] = 1;
            } else {
                reportMetrics["GENERAL_Report Generated (inconsistent) with names fully fetched from tiles_DANGER"] = 1;
                metaData.isParticipantsInfoIncomplete = true;
            }
        }
    }catch(e){
    }
    return metaData;
}

function saveReportMetrics() {
    try{
        let noOfParti = studentDetails.size;
        reportMetrics["PARTICIPANTS_0 Participants"] = noOfParti == 0 ? 1 : 0;
        reportMetrics["PARTICIPANTS_1 Participant"] = noOfParti == 1 ? 1 : 0;
        reportMetrics["PARTICIPANTS_2-10"] = noOfParti >= 2 && noOfParti <= 10 ? 1 : 0;
        reportMetrics["PARTICIPANTS_11-25"] = noOfParti > 10 && noOfParti <= 25 ? 1 : 0;
        reportMetrics["PARTICIPANTS_26-50"] = noOfParti > 25 && noOfParti <= 50 ? 1 : 0;
        reportMetrics["PARTICIPANTS_51-100"] = noOfParti > 50 && noOfParti <= 100 ? 1 : 0;
        reportMetrics["PARTICIPANTS_More than 100"] = noOfParti > 100 ? 1 : 0;

        // report avergae duration
        reportMetrics["DURATION_0 sec"] = totalClassDuration == 0 ? 1 : 0;
        reportMetrics["DURATION_Less than 5 mins"] = totalClassDuration > 0 && totalClassDuration <= 300 ? 1 : 0;
        reportMetrics["DURATION_5 to 20 mins"] = totalClassDuration > 300 && totalClassDuration <= 1200 ? 1 : 0;
        reportMetrics["DURATION_20 to 60 mins"] = totalClassDuration > 1200 && totalClassDuration <= 3600 ? 1 : 0;
        reportMetrics["DURATION_60 to 120 mins"] = totalClassDuration > 3600 && totalClassDuration <= 7200 ? 1 : 0;
        reportMetrics["DURATION_More than 120 mins"] = totalClassDuration > 7200 ? 1 : 0;

        // Accuracy
        let accuracy = Math.ceil((totalActiveDuration*100)/totalClassDuration);
        accuracy = isFinite(accuracy) ? accuracy : 1;
        reportMetrics["ACCURACY_1%"] = accuracy == 1 ? 1 : 0;
        reportMetrics["ACCURACY_Less than 20%"] = accuracy > 1 && accuracy <= 20 ? 1 : 0;
        reportMetrics["ACCURACY_20 to 40%"] = accuracy > 20 && accuracy <= 40 ? 1 : 0;
        reportMetrics["ACCURACY_40 to 60%"] = accuracy > 40 && accuracy <= 60 ? 1 : 0;
        reportMetrics["ACCURACY_60 to 80%"] = accuracy > 60 && accuracy <= 80 ? 1 : 0;
        reportMetrics["ACCURACY_More than 80%"] = accuracy > 80 ? 1 : 0;

        // General
        let validParticipantNames = 0;
        let validParticipantProfileIcons = 0;
        let studentDetailsKeys = studentDetails.keys();
        for(let particiName of studentDetailsKeys) {
            try{
                if(particiName.length > 0) {
                    validParticipantNames += 1;
                }
                let particiInfo = studentDetails.get(particiName);
                let profileIcon = particiInfo[2];
                if(!profileIcon.includes(DEFAULT_PROFILE_ICON)) {
                    validParticipantProfileIcons += 1;
                }
            }catch(e){
            }
        }
        reportMetrics["GENERAL_Report generated with profile icons_INFO"] = (noOfParti>0 && Math.ceil((validParticipantProfileIcons*100)/noOfParti)) > 75 ? 1 : 0;
        reportMetrics["GENERAL_Report generated with participant names_INFO"] = (noOfParti>0 && Math.ceil((validParticipantNames*100)/noOfParti)) > 99 ? 1 : 0;
        
        // Time taken to open participants tab
        reportMetrics["PARTTABOPENEDIN_0 to 2s"] = (timeTakenToOpenParticipantsTab >= 0 && timeTakenToOpenParticipantsTab <= 2) ? 1 : 0;
        reportMetrics["PARTTABOPENEDIN_3 to 7s"] = (timeTakenToOpenParticipantsTab >= 3 && timeTakenToOpenParticipantsTab <= 7) ? 1 : 0;
        reportMetrics["PARTTABOPENEDIN_More than 7s"] = (timeTakenToOpenParticipantsTab > 7) ? 1 : 0;
        reportMetrics["PARTTABOPENEDIN_Failed"] = timeTakenToOpenParticipantsTab == -1 ? 1 : 0;

        //Total Meeting duration vs actual tracked duration - To monitor if several user face data loss due to tab freeze by browsers
        let actualTimeForTrackAttendance = Math.floor((new Date().getTime() - attendanceReportStartTime)/1000);
        let meetingTrackedTime = Math.floor((actualTimeForTrackAttendance/totalClassDuration)*100);
        meetingTrackedTime = isFinite(meetingTrackedTime) ? meetingTrackedTime : 1;
        reportMetrics["TRACKEDTIME_More than 100%"] = meetingTrackedTime > 100 ? 1 : 0;
        reportMetrics["TRACKEDTIME_98 to 100%"] = (meetingTrackedTime > 97 && meetingTrackedTime<=100) ? 1 : 0;
        reportMetrics["TRACKEDTIME_90 to 97%"] = (meetingTrackedTime >= 90 && meetingTrackedTime <= 97) ? 1 : 0;
        reportMetrics["TRACKEDTIME_80 to 90%"] = (meetingTrackedTime>=80 && meetingTrackedTime<90) ? 1 : 0;
        reportMetrics["TRACKEDTIME_50 to 80%"] = (meetingTrackedTime >= 50 && meetingTrackedTime<80) ? 1 : 0;
        reportMetrics["TRACKEDTIME_Less than 50%"] = meetingTrackedTime < 50 && meetingTrackedTime > 1 ? 1 :0 ;
        reportMetrics["TRACKEDTIME_1%"] = meetingTrackedTime == 1 ? 1 :0 ;

        // To track if participants count shown in UI is matching with count generated by our tracker
        reportMetrics["GENERAL_Report generated with full participants count"] = isFinite(allTimeMaxUserCountShownInUI) && allTimeMaxUserCountShownInUI>0 && allTimeMaxUserCountShownInUI==noOfParti && noOfParti>0 ? 1 : 0;
        reportMetrics["GENERAL_Report generated with less participants count_WARNING"] = isFinite(allTimeMaxUserCountShownInUI) && allTimeMaxUserCountShownInUI>0 && allTimeMaxUserCountShownInUI > noOfParti && noOfParti>0 ? 1 : 0;  

    }catch(e){
        console.log("Exception while trying to track report metrics: "+e);
    }
}

function saveExtensionHealth() {
    try{
        if(document.visibilityState == 'visible') {
            // participants button selectors
            extensionHealth["DEFAULT_PARTICIPANTS_BTN_SELECTOR"] = getParticipantsBtnSelectorHealth(DEFAULT_PARTICIPANTS_BTN_SELECTOR);
            extensionHealth["FALLBACK_PARTICIPANTS_BTN_SELECTOR"] = getParticipantsBtnSelectorHealth(FALLBACK_PARTICIPANTS_BTN_SELECTOR);
            extensionHealth["OLD_UI_PARTICIPANTS_BTN_SELECTOR"] = getOldParticipantsBtnSelectorHealth(OLD_UI_PARTICIPANTS_BTN_SELECTOR);
            // participants name selectors
            extensionHealth["DEFAULT_PARTICIPANTS_NAME_SELECTOR"] = getParticipantsNamesSelectorHealth(DEFAULT_PARTICIPANTS_NAME_SELECTOR);
            extensionHealth["FALLBACK_PARTICIPANTS_NAME_SELECTOR"] = getParticipantsNamesSelectorHealth(FALLBACK_PARTICIPANTS_NAME_SELECTOR);
            // participants image selectors
            extensionHealth["DEFAULT_PARTICIPANTS_IMG_SELECTOR"] = getParticipantsImageSelectorHealth(DEFAULT_PARTICIPANTS_NAME_SELECTOR);
            extensionHealth["FALLBACK_PARTICIPANTS_IMG_SELECTOR"] = getParticipantsImageSelectorHealth(FALLBACK_PARTICIPANTS_NAME_SELECTOR);
            // Class name -> The only using class names ...even if this changes report will be generated..but the waiting to join participants will also be included
            let contributorsEle = getContributorsDocumentToFetchParticipantsName();
            extensionHealth["DEFAULT_CONTRIBUTORS_ELE_CLASS"] = (contributorsEle!=null && contributorsEle && contributorsEle.querySelectorAll(DEFAULT_PARTICIPANTS_NAME_SELECTOR).length > 0) ? 1 : 0;
            let countOfParti = getParticipantsCountInMeeting();
            extensionHealth["PARTICIPANTS_COUNT_SELECTOR_CLASS"] = countOfParti > 0 ? 1 : 0;
        }
    }catch(e){
        console.log("Exception while trying to track extension health: "+e);
    }
}

function getParticipantsBtnSelectorHealth(participantsBtnSelector) {
    try{
        let participantsCont = document.body.querySelectorAll(participantsBtnSelector);
        let filteredButtons = getButtonsUnderGoogleImgOrWithNumber(participantsCont);
        if(filteredButtons.length > 0) {
            return 1;
        }         
    }catch(e){
    }
    return 0;
}

function getOldParticipantsBtnSelectorHealth(participantsBtnSelector) {
    try{
        let oldUiButtons = document.body.querySelectorAll(participantsBtnSelector);
        if(oldUiButtons.length > 0) {
            return 1;
        }
    }catch(e){
    }
    return 0;
}

function getParticipantsNamesSelectorHealth(participantsNameSelector) {
    try{
        let participantsCont = document.body.querySelectorAll(participantsNameSelector);
        if(participantsCont.length > 0) {
            const el = participantsCont[0];
            const name = el.getAttribute('aria-label')?.trim() || el.querySelector('span')?.textContent?.trim() || el.querySelector('span.notranslate')?.textContent?.trim() || null;
            if(name != null && typeof(name)=='string' && name && name.length>0) {
                return 1;
            }
        }   
    }catch(e){
    }
    return 0;
}

function getParticipantsImageSelectorHealth(participantsNameSelector) {
    try{
        let participantsCont = document.body.querySelectorAll(participantsNameSelector);
        if (participantsCont.length > 0) {
            for (let i = 0; i < participantsCont.length; i++) {
                const el = participantsCont[i];
                const imgEl = el.querySelector(PARTICIPANT_IMAGE_SELECTOR);
                const imageUrl = imgEl?.src || DEFAULT_PROFILE_ICON;
                if (!imageUrl.includes(DEFAULT_PROFILE_ICON)) {
                    return 1;
                }
            }
        }   
    }catch(e){
    }
    return 0;
}

function showContactUsAlert(redirectToSupportPage=true,source="extension") {
    try{
        if(!wasAlreadyAlerted) {
            let alertContent = redirectToSupportPage ? "Something went wrong in Meet Attendance Tracker chrome extension! Please contact us in the next step" : "Something went wrong in Meet Attendance Tracker chrome extension! Please contact shaileshrkumar@hotmail.com";
            alert(alertContent);
            wasAlreadyAlerted = true;
            if(redirectToSupportPage) {
                let contactUsURL = getContactUsURL();
                contactUsURL += "?type=extError&source="+source;
                window.open(contactUsURL);
            }
        }
    }catch(e){
    }
}

function showBanner(bannerTitle, bannerContent, buttonContent, actionBtnCallBack) {
    try {
        if(document.getElementById("meetAttendanceTrackExtensionBanner") == null) {
          let bannerHTML = `<div id='meetAttendanceTrackExtensionBanner' style='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;max-width:94%;padding:20px;border-radius:10px;border:1px solid #d9534f;background:linear-gradient(180deg,#fff4e5,#fff1c2);color:#663c00;font-family:Inter,Arial,sans-serif;font-size:14px;display:flex;flex-direction:column;gap:14px;box-shadow:0 10px 28px rgba(0,0,0,0.2);z-index:2147483647;position:relative;'> <button id='meetAttendanceTrackExtensionBannerClose' style='all:unset;position:absolute;top:10px;right:10px;cursor:pointer;font-size:16px;line-height:1;color:#663c00;'>✖</button> <div style='display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;'> <span style='font-size:18px;'>⚠️</span> <span>${bannerTitle}</span> </div> <div style='display:flex;gap:10px;align-items:flex-start;font-weight:600;'> <span>${bannerContent}</span> </div> <div style='display:flex;justify-content:flex-end;gap:10px;margin-top:6px;'><span id="bannerContactUsLink" style="color: #0060de; margin-top: 7px; margin-right: 10px; cursor: pointer; text-decoration: underline;"> <b>Contact Support </b></span> <button id='meetAttendanceTrackerBannerActionBtn' style='all:unset;cursor:pointer;padding:8px 14px;border-radius:6px;font-weight:600;background:#1a73e8;color:#fff;'>${buttonContent}</button> </div> </div>`;
          document.body.insertAdjacentHTML("beforeend", bannerHTML);
            let bannerEle = document.getElementById("meetAttendanceTrackExtensionBanner");
            if(bannerEle!=null) {
                let bannerCloseBtn = document.getElementById("meetAttendanceTrackExtensionBannerClose");
                if(bannerCloseBtn!=null) {
                    bannerCloseBtn.addEventListener("click", function(){
                        removeBanner();
                    });
                }
                let bannerActionBtn = document.getElementById("meetAttendanceTrackerBannerActionBtn");
                if(bannerActionBtn!=null) {
                    bannerActionBtn.addEventListener("click", function(){
                        actionBtnCallBack();
                    });
                }
                let bannerContactUsEle = document.getElementById("bannerContactUsLink");
                if(bannerContactUsEle!=null) {
                    bannerContactUsEle.addEventListener("click", function(){
                        let supportURL = getContactUsURL()+"?source=extErrorBanner";
                        window.open(supportURL);
                    });
                }
            }
        }
    } catch (e) {
    }
}

function removeBanner() {
    try {
        let bannerEle = document.getElementById("meetAttendanceTrackExtensionBanner");
        if(bannerEle != null) {
            bannerEle.remove();
        }
    } catch (e) {
    }
}

// Doing this for perfomance as we are store the full html..GC can drain device battery
function saveMeetUISnapShot() {
    try{
        let currTime = new Date().getTime();
        if(lastUISnapSavedTime==null || (currTime - lastUISnapSavedTime > 17000)) {
            lastUISnapSavedTime = currTime;
            documentBody = document.body.innerHTML;
        }
    }catch(e){
        console.log("Unable to save UI snap");
    }
}

function isValidMessageListenerCall(event) {
    try {
        if (event && event.origin && event.origin == getProductURL()) {
            return true;
        }
    } catch (e) {
        console.log("Exception while checking if it is a valid message listener call" + e);
    }
    return false;
}

function canProcessEvent(event) {
    try {
        if (event && event.data != undefined && isJSON(event.data)) {
            return true;
        }
    } catch (e) {
        console.log("Exception while checking if can process event " + e);
    }
    return false;
}

function getMeetingCode() {
    try{
        return window.location.pathname.substring(1);
    }catch(e){
    }
    return "meet";
}

function setDefaultReportMetrics() {
    try{
        reportMetrics = {};
        reportMetrics["GENERAL_Report generated with meet end call button"] = 0;
        reportMetrics["GENERAL_Report generated with stop button"] = 0;
    }catch(e){
    }
}

function hasAttribute(attributeName) {
    try{
        let attributeNode = document.body.querySelectorAll("["+attributeName+"]");
        return attributeNode.length>0;
    }catch(e) {
        console.log("Exception while checking hasAttribute for: "+attributeName+" -> "+e);
    }
    return false;
}

function getAttributeElements(attributeName) {
    try{
        let attributeNode = document.body.querySelectorAll("["+attributeName+"]");
        return attributeNode;
    }catch(e){
        console.log("Exception while running getAttributeElements for: "+attributeName+" -> "+e);
    }
    return null;
}

function getAttributeLen(attributeName) {
    try{
        let attributeNode = document.body.querySelectorAll("["+attributeName+"]");
        return attributeNode.length;
    }catch(e) {
        console.log("Exception while running getAttributeLen for: "+attributeName+" -> "+e);
    }
    return 0;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function toTimeFormat(time) {
    let hh = Math.floor(time / 3600);
    time = time - (hh * 3600);
    let mm = Math.floor(time / 60);
    time = time - (mm * 60);
    let ss = time;
    if (hh == 0) return mm + " min " + ss + "s";
    else return hh + " hr " + mm + " min " + ss + "s";
}

function isJSON(data) {
    try {
        JSON.parse(data);
        return true;
    } catch (ex) {
        console.log("Not a valid JSON received: "+ex);
    }
    return false;
}