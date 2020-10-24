import * as config from './config.js';

/**
 * Initialize Firebase and get references
 **/

firebase.initializeApp(config.firebaseConfig);
firebase.analytics();
var authProvider = new firebase.auth.GoogleAuthProvider();
const reservesDbRef = firebase.database().ref("/reserves");

/**
 * Dates parsing and computing
 */

function monthNumberFromAbbreviation(monthStr, appConfig) {
    return appConfig.monthsAbbr.indexOf(monthStr);
}

function fromShortDateString(shortDateString, appConfig) {
    let nowDate = new Date(Date.now());
    let year = nowDate.getFullYear();
    let regex = /(\w)\s(\d*)-(\w\w\w)/;
    let match = shortDateString.match(regex);
    let weekDayStr = match[1];
    let monthDayStr = match[2];
    let monthAbbrevStr = match[3];
    return new Date(
        year,
        monthNumberFromAbbreviation(monthAbbrevStr, appConfig),
        parseInt(monthDayStr)
    );
}

function toShortDateString(date) {
    return config.appConfig.weekDaysAbbr[date.getDay()] + " " + date.getDate() + "-" + config.appConfig.monthsAbbr[date.getMonth()];
}

function getDaysFrom(fromDate, num) {
    let days = [];
    for (let i = 0; i < num; ++i) {
        let day = new Date(fromDate.valueOf());
        day.setDate(day.getDate() + i);
        days.push(toShortDateString(day));
    }
    return days;
}

function getFirstDayOfWeekOf(date) {
    let today = date;
    let todaysWeekday = today.getDay();
    let daysBack = todaysWeekday;
    let firstDay = today;
    firstDay.setDate(firstDay.getDate() - daysBack + 1);
    return firstDay;
}

function getFirstDayOfCurrentWeek() {
    return getFirstDayOfWeekOf(new Date(Date.now()));
}

/**
 * Pool size and availability
 */

class PoolRule {
    constructor(obj) {
        this.from = (obj.from ?? null);
        this.to = (obj.to ?? null);
        this.hours = (obj.hours ?? []);
        this.number = (obj.number ?? null);
    }
    evalRule(day, hour) {
        let date = fromShortDateString(day, config.appConfig);
        if ((!this.from || date.valueOf() >= this.from.valueOf())
            && (!this.to || date.valueOf() <= this.to.valueOf())
            && (!this.hours || this.hours.length === 0 || this.hours.includes(hour))) {
            return this.number;
        }
        else {
            return null;
        }
    }
}

const poolRules = [
    new PoolRule({ number: 31 }),
    new PoolRule({ from: new Date(2020, 9, 12), to: new Date(2020, 9, 12), number: 0 }),
    new PoolRule({ from: new Date(2020, 10, 2), to: new Date(2020, 10, 2), number: 0 })
];

function poolSize(rules, day, hour, maxPoolSize) {
    let size = maxPoolSize;
    for (let i = 0; i < rules.length; ++i) {
        size = rules[i].evalRule(day, hour) ?? size;
    }
    return size;
}

function totalReserved(db, day, hour) {
    let total = 0;
    if (db && db[day] && db[day][hour]) {
        for (let id in db[day][hour]) {
            total += db[day][hour][id].number;
        }
    }
    return total;
}

function spare(db, day, hour) {
    return poolSize(poolRules, day, hour, config.appConfig.maxPoolSize) - totalReserved(db, day, hour);
}

function reservedInSlot(slotSnapshot) {
    let total = 0;
    if (slotSnapshot) {
        for (let id in slotSnapshot) {
            total += slotSnapshot[id].number;
        }
    }
    return total;
}

function spareInSlot(slotSnapshot, day, hour) {
    return poolSize(poolRules, day, hour, config.appConfig.maxPoolSize) - reservedInSlot(slotSnapshot);
} class Reserve {
    constructor(day, hour, name, number) {
        this.day = day;
        this.hour = hour;
        this.name = name;
        this.number = number;
    }
};

function poolSizeColor(poolSize, colorScale) {
    for (let size in colorScale) {
        if (size !== "other" && poolSize <= parseInt(size)) {
            return colorScale[size];
        }
    }
    return colorScale.other;
}

/**
 * UI elements
 */

/**
 * Main Window
 */

function makeDayHourLabels(appConfig) {
    let dayHourLabels = new Array();

    for (let i = 0; i < appConfig.dayHours.length; ++i) {
        let dayHourLabel = new Label({
            text: appConfig.dayHours[i],
            color: light,
            backing: new Rectangle({
                width: 230,
                height: appConfig.dayHourHeights[i],
                color: dark,
                corner: 5
            }).centerReg(),
            align: "center",
            valign: "middle"
        });
        dayHourLabels[i] = dayHourLabel;
    }
    return dayHourLabels;
}

function makeHeaderRow(days) {
    let headerRow = new Array();
    headerRow[0] = new Rectangle(230, 90, light).centerReg();
    for (let i = 0; i < days.length; ++i) {
        let weekDayLabel = new Label({
            text: days[i],
            color: light,
            backing: new Rectangle({
                width: 200,
                height: 90,
                color: dark,
                corner: 5
            }).centerReg(),
            align: "center",
            valign: "middle"
        });
        headerRow[i + 1] = weekDayLabel;
    }
    return headerRow;
}

function makeSlotElements(appConfig, hourLabels, days, stage, db) {
    let slotElements = new Array();
    for (let i = 0; i < appConfig.dayHours.length; ++i) {
        slotElements[i * (days.length + 1)] = hourLabels[i];
        for (let j = 0; j < days.length; ++j) {
            let slotButton = new Button({
                label: new Label({ text: spare(db, days[j], appConfig.dayHours[i]) }),
                width: 200,
                height: appConfig.dayHourHeights[i],
                corner: 5,
                backgroundColor: poolSizeColor(spare(db, days[j], appConfig.dayHours[i]), appConfig.poolSizeColorScale),
                rollBackgroundColor: orange
            });
            if (!db[days[j]]) {
                db[days[j]] = {};
            }
            if (!db[days[j]][appConfig.dayHours[i]]) {
                db[days[j]][appConfig.dayHours[i]] = {};
            }
            slotButton.on("click", () => clickOnSlot(stage, db[days[j]][appConfig.dayHours[i]], days[j], appConfig.dayHours[i]));
            slotElements[i * (days.length + 1) + j + 1] = slotButton;
        }
    }
    return slotElements;
}

function clickOnSlot(stage, slotSnapshot, day, hour) {
    let win = new Window({
        width: 1600,
        height: 800,
        interactive: true,
        titleBar: new Label({
            text: `Reservas para: ${day} ${hour}`,
            size: 50
        }),
        titleBarHeight: 60,
        titleBarColor: dark,
        titleBarBackgroundColor: silver,
        close: true
    });

    let reserveButton = new Button({
        label: new Label({ text: `Añadir reserva`, color: dark }),
        width: 400,
        height: 100,
        backgroundColor: green,
        rollBackgroundColor: brown,
    });
    reserveButton.on("click", () => {
        if (spareInSlot(slotSnapshot, day, hour) > 0) {
            let newReserve = new Reserve(day, hour, "", spareInSlot(slotSnapshot, day, hour));
            let id = firebase.database().ref(`/reserves/${day}/${hour}`).push(newReserve);
            slotSnapshot[id] = newReserve;
            showReserveTip(reserveButton);
        }
    });
    reserveButton.addTo(win).loc(50, 600);

    let table = new Tile({
        obj: [],
        unique: true,
        width: 1600,
        cols: 1,
        rows: 0,
        spacingV: 20
    });
    table.loc(50, 50);
    win.add(table);

    win.center();
    win.on("close", () => {
        firebase.database().ref(`/reserves/${day}/${hour}`).off();
    });
    stage.update();

    firebase.database().ref(`/reserves/${day}/${hour}`).on("value", (snapshot) => {
        slotSnapshot = snapshot.val();
        remakeReserveTable(win, table, slotSnapshot, day, hour);
        updateReserveButton(reserveButton, slotSnapshot, day, hour);
        stage.update();
    });
}

function remakeWeekCalendar(appConfig, days, hourLabels, stage, db, weekCalendar) {
    let header = makeHeaderRow(days);
    let slots = makeSlotElements(appConfig, hourLabels, days, stage, db);
    let elements = header.concat(slots);
    weekCalendar.remake(elements);
    stage.update();
}

function drawMainWindow(stage, db) {
    let mainWindow = new Container();

    let dayHourLabels = makeDayHourLabels(config.appConfig);
    let headerRow = makeHeaderRow(currentDays);
    let slotElements = makeSlotElements(config.appConfig, dayHourLabels, currentDays, stage, db);
    let weekCalendarElements = headerRow.concat(slotElements);

    let weekCalendar = new Tile({
        obj: weekCalendarElements,
        unique: true,
        width: 1300,
        height: 900,
        cols: 6,
        rows: 10,
        spacingH: 30,
        spacingV: 5,
        squeezeH: true,
        valign: "center"
    });

    let calendar = new Container().addTo(mainWindow);
    weekCalendar.addTo(calendar);
    calendar.center().mov(0, 20);

    let previousWeekButton = new Button({
        width: 110,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("play", light)
    });
    previousWeekButton.icon.rotation = 180;
    previousWeekButton.on("click", () => {
        startDay.setDate(startDay.getDate() - 7);
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(config.appConfig, currentDays, dayHourLabels, stage, db, weekCalendar);
    });

    let nextWeekButton = new Button({
        width: 110,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("play", light)
    });
    nextWeekButton.on("click", () => {
        startDay.setDate(startDay.getDate() + 7);
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(config.appConfig, currentDays, dayHourLabels, stage, db, weekCalendar);
    });

    let todayButton = new Button({
        label: new Label({ text: "HOY", color: light }),
        width: 150,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        // label: "",
        // icon: pizzazz.makeIcon("home", light)
    });
    todayButton.on("click", () => {
        startDay = getFirstDayOfCurrentWeek();
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(config.appConfig, currentDays, dayHourLabels, stage, db, weekCalendar);
    });

    let weekButtons = new Tile({
        obj: [previousWeekButton, todayButton, nextWeekButton],
        unique: true,
        width: 430,
        height: 80,
        rows: 1,
        cols: 3,
        spacingH: 10,
        squeezeH: false
    });
    weekButtons.addTo(mainWindow).pos({ horizontal: LEFT, vertical: TOP }).mov(260, -70);

    let userLabel = new Label({
        text: (user) ? user.email : "",
        size: 30,
        align: "right",
        color: orange
    }).addTo(mainWindow).pos({ horizontal: RIGHT, vertical: TOP }).mov(0, -110);

    let logoutButton = new Button({
        label: new Label("LOGOUT"),
        height: 80
    });
    logoutButton.on("click", () => {
        if (user) {
            firebase.auth().signOut();
        }
    });
    logoutButton.addTo(mainWindow);
    logoutButton.pos({ horizontal: RIGHT, vertical: TOP }).mov(0, -70);

    return { main: mainWindow, week: weekCalendar, hours: dayHourLabels, user: userLabel };
}

/**
 * Reserve window
 */

function updateReserveButton(button, slotSnapshot, day, hour) {
    if (spareInSlot(slotSnapshot, day, hour) > 0) {
        enableReserveButton(button);
    }
    else {
        disableReserveButton(button);
    }
}

function disableReserveButton(button) {
    button.text = "No quedan Chromebook";
    button.backgroundColor = red;
    button.color = light;
    button.rollBackgroundColor = red;
}

function enableReserveButton(button) {
    button.text = "Añadir reserva";
    button.backgroundColor = green;
    button.color = dark;
    button.rollBackgroundColor = brown;
}

function createNameList(id, reserve, day, hour, entry) {
    let nameList = new List({
        list: config.appConfig.names,
        width: 500,
        height: 500,
        viewNum: 5,
        currentSelected: true,
        selectedBackgroundColor: green,
        titleBar: new Label({ text: "Profesor", size: 30 }),
        titleBarBackgroundColor: light,
        titleBarHeight: 30,
        close: true,
        draggable: false
    });
    nameList.addTo(entry);
    nameList.loc(1030, -30);
    nameList.currentValue = reserve.name;
    nameList.change(() => {
        reserve.name = nameList.currentValue;
        entry.getChildAt(0).text = nameList.currentValue;
        nameList.dispose();
        nameList = null;
        let updates = {};
        updates[`/reserves/${day}/${hour}/${id}`] = reserve;
        firebase.database().ref().update(updates);
    });
}

function showReserveTip(target) {
    let addReserveTip = new Tip({
        text: "Selecciona tu nombre en la lista, y\nmodifica el número de Chromebook que quieres reservar.",
        outside: true,
        target: target,
        valign: "top",
        align: "right"
    });
    addReserveTip.show(0, 4);
}

function remakeReserveTable(win, table, slotSnapshot, day, hour) {
    let entries = [];
    if (slotSnapshot) {
        for (let id in slotSnapshot) {
            let entry = createReserveRow(id, slotSnapshot, day, hour);
            win.add(entry);
            entries.push(entry);
            if (slotSnapshot[id].name === "") {
                createNameList(id, slotSnapshot[id], day, hour, entry);
            }
        }
    }
    table.remake(entries);
    return table;
}

function createReserveRow(id, slotSnapshot, day, hour) {
    let reserve = slotSnapshot[id];
    let container = new Container();
    let nameBox = new Button({
        label: new Label({ text: reserve.name, size: 50 }),
        width: 500,
        height: 100,
        color: dark,
        backgroundColor: light,
        rollBackgroundColor: brown,
        corner: 0
    }).centerReg();
    nameBox.on("click", () => {
        createNameList(id, reserve, day, hour, container);
    });
    let deleteButton = new Button({
        icon: pizzazz.makeIcon("close", red),
        width: 100,
        height: 100,
        color: red,
        backgroundColor: brown,
        rollBackgroundColor: red,
        rollIcon: pizzazz.makeIcon("close", light)
    }).centerReg();
    deleteButton.on("click", () => {
        firebase.database().ref(`/reserves/${day}/${hour}/${id}`).remove();
    })
    let stepper = new Stepper({
        min: 0,
        max: reserve.number + spareInSlot(slotSnapshot, day, hour)
    }).centerReg();
    let tile = new Tile({
        obj: [deleteButton, nameBox, stepper],
        spacingH: 10,
        width: 1000,
        rows: 1,
        cols: 3,
        unique: true
    }).addTo(container);
    stepper.currentValue = reserve.number;
    stepper.on("change", () => {
        reserve.number = stepper.currentValue;
        let updates = {};
        updates[`/reserves/${day}/${hour}/${id}`] = reserve;
        firebase.database().ref().update(updates);
    });
    return container;
}

function userHasAccess(userCredentials) {
    if (userCredentials.email === "manuelperezpinar@gmail.com") {
        return false;
    }
    else {
        return true;
    }
}

/** 
 * App state
 **/

var localDb = {};
var user = null;
var startDay = getFirstDayOfCurrentWeek();
var currentDays = getDaysFrom(startDay, 5);

/**
 * Init app
 */

var frame = new Frame(config.frameConfig);
frame.on("ready", function () {
    zog("ready from ZIM Frame");

    var stage = frame.stage;
    var stageW = frame.width;
    var stageH = frame.height;

    let mainWindow = drawMainWindow(stage, {});

    let loginPane = new Pane({
        width: stageW,
        height: stageH,
        backgroundColor: light,
        modal: false,
        backdropClose: false,
        displayClose: false
    }).center().show();

    let loginButton = new Button({
        label: new Label("LOGIN")
    }).addTo(loginPane).center();
    loginButton.on("click", () => {
        firebase.auth().signInWithPopup(authProvider).then((cred) => {
            if (cred.user) {
                console.log(`Logged in: ${cred.user.email}`);
                user = cred.user;
            }
            else {
                console.log("Authentication failed.");
            }
        })
    });

    let loginTip = new Tip({
        text: "Bienvenido al servicio de reserva de Chromebooks. Pulsa el botón para empezar.",
        align: "center",
        valign: "bottom",
        outside: false,
        target: loginPane
    });
    loginTip.addTo(loginPane).hide();

    firebase.auth().onAuthStateChanged(authUser => {
        user = authUser;
        if (user) {
            zog(user);
            if (userHasAccess(user)) {
                loginTip.text = "Bienvenido al servicio de reserva de Chromebooks. Pulsa el botón para empezar.";
                mainWindow.user.text = user.email;
                loginPane.hide();
                mainWindow.main.center();
                stage.update();
            }
            else {
                loginTip.text = `Lo siento: la cuenta ${user.email} no está autorizada. Contacta con mperez@fomento.edu.`;
                firebase.auth().signOut();
            }
        }
        else {
            mainWindow.user.text = "";
            console.log("No user logged in.");
            loginPane.show();
            loginTip.clear();
            loginTip.show(0, 10);
        }
    })

    reservesDbRef.on("value", (snapshot) => {
        console.log("updating local db...");
        remakeWeekCalendar(config.appConfig, currentDays, mainWindow.hours, stage, snapshot.val(), mainWindow.week);
    });

    stage.update();

}); // end of ready

class Slot {
    constructor(day, hour, reserves) {
        this.day = day;
        this.hour = hour;
        this.reserves = reserves;
    }
}

class State {
    constructor(app) {
        this.app = app;
    }
}

class NotLoggedIn extends State {
    login() {
        this.app.authBackend.signInWithPopup(authProvider)
            .then((credentials) => {
                if (credentials.user) {
                    if (userHasAccess(credentials.user)) {
                        console.log(`Logged in as ${credentials.user.email}`);
                        this.app.state = new ChooseSlot(this.app);
                    }
                    else {
                        this.app.authBackend.signOut();
                    }
                }
                else {
                    console.log("Authentication failed.");
                }
            });
    }
    logout() {
        console.log("Already logged out.");
    }
    syncDb() {
        console.log("No user logged in. Nothing to sync.");
    }
}

class ChooseSlot extends State {
    logout() {
        if (this.app.user) {
            this.app.authBackend.signOut();
            this.chosenSlot = null;
            this.app.state = new NotLoggedIn(this.app);
        }
        console.log("No user logged in.");
    }
    syncDb(snapshot) {
        this.app.ui.syncDb(snapshot);
    }
    gotoToday() {
        this.app.startDay = getFirstDayOfCurrentWeek();
        this.app.ui.updateDate(this.currentDays);
    }
    gotoNextWeek() {
        this.app.startDay = setDate(this.app.startDay.getDate() + 7);
        this.app.currentDays = getDaysFrom(this.app.startDay, 5);
        this.app.ui.updateDate(this.currentDays);
    }
    gotoPreviousWeek() {
        this.app.startDay = setDate(this.app.startDay.getDate() - 7);
        this.app.currentDays = getDaysFrom(this.app.startDay, 5);
        this.app.ui.updateDate(this.currentDays);
    }
    openSlot(slot) {
        this.app.chosenSlot = slot;
        this.app.ui.openSlot(slot);
        this.app.authBackend.ref(`/reserves/${slot.day}/${slot.hour}`).on("value", (snapshot) => {
            this.app.chosenSlot.reserves = snapshot;
            this.app.ui.syncSlot(snapshot);
        });
        this.app.state = new EditSlot(this.app);
    }
}

class EditSlot extends State {
    addReserve() {
        if (spareInSlot(this.app.chosenSlot) > 0) {
            let reserve = new Reserve(
                this.app.chosenSlot.day,
                this.app.chosenSlot.hour,
                "",
                spareInSlot(this.app.chosenSlot));
            let id = this.app.dbBackend.ref(`/reserves/${this.app.slot.day}/${this.app.slot.hour}`).push(reserve);
            return id;
        }
    }
    deleteReserve(id) {
        this.app.dbBackend.ref(`/reserves/${this.app.chosenSlot.day}/${this.app.chosenSlot.hour}/${id}`).remove();
    }
    changeReservedNumber(id, number) {
        let slot = this.app.chosenSlot;
        let reserve = slot.reserves.id;
        reserve.number = number;
        let updates = {};
        updates[`/reserves/${slot.day}/${slot.hour}/${id}`] = reserve;
        this.app.dbBackend.ref().update(updates);
    }
    changeReserveName(id, name) {
        let slot = this.app.chosenSlot;
        let reserve = slot.reserves.id;
        reserve.name = name;
        let updates = {};
        updates[`/reserves/${slot.day}/${slot.hour}/${id}`] = reserve;
        this.app.dbBackend.ref().update(updates);
    }
    closeSlot() {
        this.app.chosenSlot = null;
        this.app.ui.closeSlot();
        this.app.authBackend.ref(`/reserves/${this.app.chosenSlot.day}/${this.app.chosenSlot.hour}`).off();
        this.app.state = new ChooseSlot(this.app);
    }
    logout() {
        if (this.app.user) {
            this.app.authBackend.signOut();
            this.chosenSlot = null;
            this.app.state = new NotLoggedIn(this.app);
        }
        console.log("No user logged in.");
    }
}

class App {
    constructor(authBackend, dbBackend, poolRules, startDay, currentDays, ui) {
        this.authBackend = authBackend;
        this.dbBackend = dbBackend;
        this.poolRules = poolRules;
        this.startDay = startDay;
        this.currentDays = currentDays;
        this.ui = new UI(this);
        this.user = null;
        this.state = new NotLoggedIn(this);
        this.chosenSlot = null;

        this.dbBackend.ref("/reserves").on("value", (snapshot) => {
            console.log("Updating local db...");
            this.state.syncDb(snapshot);
        });

        this.authBackend.onAuthStateChanged(userCredentials => {
            this.user = userCredentials;
            this.ui.changeUser(this.user);
        });
    }
    login() {
        this.state.login();
    }
    logout() {
        if (this.app.user) {
            this.app.authBackend.signOut();
            this.app.user = null;
        }
        console.log("No user logged in.");
        this.state.logout();
    }
    gotoToday() {
        this.state.gotoToday();
    }
    gotoNextWeek() {
        this.state.gotoNextWeek();
    }
    gotoPreviousWeek() {
        this.state.gotoPreviousWeek();
    }
    openSlot() {
        this.state.openSlot();
    }
}
