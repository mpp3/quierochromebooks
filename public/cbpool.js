import * as config from './config.js';

/**
 * Initialize Firebase and get references
 **/

firebase.initializeApp(config.firebaseConfig);
firebase.analytics();
var authProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Populate users
 */

var users = {};
var names = [];

firebase.database().ref('/users').on('value', (snapshot) => {
    users = snapshot.val();
    Object.keys(users).forEach((key, value) => {
        names.push(key);
    });
});

function iniciales(email) {
    for (let user in users) {
        if (users[user].email === email) {
            return users[user].iniciales;
        }
    }
    return "";
}

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
        Object.keys(slotSnapshot).forEach((id, index) => {
            total += slotSnapshot[id].number;
        });
    }
    return total;
}

function spareInSlot(slotSnapshot, day, hour) {
    return poolSize(poolRules, day, hour, config.appConfig.maxPoolSize) - reservedInSlot(slotSnapshot);
}

class Reserve {
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
    button.rollBackgroundColor = orange;
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

function userHasAccess(userCredentials) {
    if (userCredentials.email === "manuelperezpinar@gmail.com") {
        return false;
    }
    else {
        return true;
    }
}

var frame = new Frame(config.frameConfig);
frame.on("ready", function () {
    zog("ready from ZIM Frame");

    var stage = frame.stage;
    var stageW = frame.width;
    var stageH = frame.height;

    var app = new App(
        firebase.auth(),
        firebase.database(),
        poolRules,
        getFirstDayOfCurrentWeek(),
        getDaysFrom(getFirstDayOfCurrentWeek(), 5)
    );

    var ui = new UI(app, frame, config.appConfig);

    app.ui = ui;

    stage.update();

}); // end of ready

class UI {
    constructor(app, frame, config) {
        this.app = app;
        this.frame = frame;
        this.config = config;
        this.loginWindow = createLoginWindow(this.app, this.frame);
        this.loginWindow.show();
        this.mainWindow = createMainWindow(this.app, this.frame, this.config);
        this.mainWindow.window.hide();
        this.slotWindow = createSlotWindow(this.app, this.frame);
        this.slotWindow.window.hide();
        this.frame.stage.update();
    }
    syncSlot(slotSnapshot) {
        let day = this.app.chosenSlot.day;
        let hour = this.app.chosenSlot.hour;
        updateSlotWindowTitleBar(this.slotWindow, day, hour);
        let entries = createReserveList(this.app, slotSnapshot, day, hour);
        this.slotWindow.table.remake(entries);
        updateReserveButton(this.slotWindow.button, slotSnapshot, day, hour);
        this.frame.stage.update();
    }
    syncDb(db) {
        let days = this.app.currentDays;
        let hourLabels = this.mainWindow.hours;
        let calendar = this.mainWindow.calendar;
        remakeWeekCalendar(this.app, this.config, hourLabels, days, calendar);
        this.frame.stage.update();
    }
    updateDate(days, db) {
        this.syncDb(db);
    }
    changeUser(user) {
        if (user) {
            this.loginWindow.hide();
            this.openMainWindow();
        }
        else {
            this.loginWindow.show();
            this.closeMainWindow();
        }
        this.frame.stage.update();
    }
    openSlot(slot) {
        this.closeMainWindow();
        this.slotWindow.window.show();
        this.syncSlot(slot.reserves);
    }
    closeSlot() {
        this.slotWindow.window.hide();
        this.openMainWindow();
        this.frame.stage.update();
    }
    openMainWindow() {
        this.mainWindow.window.show();
        this.mainWindow.user.text = this.app.user.email;
        this.syncDb(this.app.db);
        this.frame.stage.update();
    }
    closeMainWindow() {
        this.mainWindow.window.hide();
        this.mainWindow.user.text = "";
        this.frame.stage.update();
    }
}

function createLoginWindow(app, frame) {
    let loginWindow = new Pane({
        width: frame.width,
        height: frame.height,
        backgroundColor: light,
        modal: false,
        backdropClose: false,
        displayClose: false
    }).addTo(frame.stage).center();

    let loginButton = new Button({
        label: new Label({ text: "LOGIN\ncon Google", size: 60, align: "center", color: light }),
        width: 400,
        height: 300,
        backgroundColor: dark,
        rollBackgroundColor: orange
    }).addTo(loginWindow).center();

    loginButton.on("click", () => app.login());

    let loginTip = new Tip({
        text: "Bienvenido al servicio de reserva de Chromebooks. Pulsa el botón para empezar.",
        align: "center",
        valign: "bottom",
        outside: false,
        target: loginWindow
    });
    loginTip.addTo(loginWindow).hide();

    return loginWindow;
}

function createMainWindow(app, frame, uiConfig) {
    let mainWindow = new Pane({
        width: frame.width,
        height: frame.height,
        backgroundColor: light,
        modal: false,
        backdropClose: false,
        displayClose: false
    }).addTo(frame.stage).center();

    let dayHourLabels = createDayHourLabels(uiConfig);
    let headerRow = createHeaderRow(app.currentDays);
    let slotElements = createSlotElements(app, uiConfig, dayHourLabels, app.currentDays);
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
    previousWeekButton.on("click", () => app.gotoPreviousWeek());

    let nextWeekButton = new Button({
        width: 110,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("play", light)
    });
    nextWeekButton.on("click", () => app.gotoNextWeek());

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
    todayButton.on("click", () => app.gotoToday());

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
    weekButtons.addTo(mainWindow).centerReg().center().mov(0, -frame.height / 2 + 50);

    let userLabel = new Label({
        text: "",
        size: 30,
        align: "right",
        color: orange
    }).addTo(mainWindow).pos({ y: 10, horizontal: RIGHT, vertical: TOP }).mov(-30, 0);

    let logoutButton = new Button({
        label: new Label({ text: "LOGOUT", color: light }),
        height: 60,
        backgroundColor: dark,
        rollBackgroundColor: orange
    });
    logoutButton.on("click", () => app.logout());
    logoutButton.addTo(mainWindow);
    logoutButton.pos({ y: 50, horizontal: RIGHT, vertical: TOP }).mov(-30, 0);

    return {
        window: mainWindow,
        calendar: weekCalendar,
        hours: dayHourLabels,
        days: headerRow,
        slots: slotElements,
        user: userLabel
    };

}

function createDayHourLabels(uiConfig) {
    let dayHourLabels = new Array();

    for (let i = 0; i < uiConfig.dayHours.length; ++i) {
        let dayHourLabel = new Label({
            text: uiConfig.dayHours[i],
            color: light,
            backing: new Rectangle({
                width: 230,
                height: uiConfig.dayHourHeights[i],
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

function createHeaderRow(days) {
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

function createSlotElements(app, uiConfig, hourLabels, days) {
    let hours = uiConfig.dayHours;
    let slotElements = new Array();
    for (let i = 0; i < hours.length; ++i) {
        let hour = hours[i];
        slotElements[i * (days.length + 1)] = hourLabels[i];
        for (let j = 0; j < days.length; ++j) {
            let day = days[j];
            let slotButton = new Button({
                label: new Label({
                    text: spare(app.db, day, hour)
                }),
                width: 200,
                height: uiConfig.dayHourHeights[i],
                corner: 5,
                backgroundColor: poolSizeColor(spare(app.db, day, hour), uiConfig.poolSizeColorScale),
                rollBackgroundColor: orange
            });
            let slot = new Slot(day, hour, {});
            slotButton.on("click", () => app.openSlot(slot));
            slotElements[i * (days.length + 1) + j + 1] = slotButton;
        }
    }
    return slotElements;
}

function remakeWeekCalendar(app, uiConfig, hourLabels, days, weekCalendar) {
    let header = createHeaderRow(days);
    let slots = createSlotElements(app, uiConfig, hourLabels, days);
    let elements = header.concat(slots);
    weekCalendar.remake(elements);
}

function createNameList(app, id, reserve, entry) {
    let nameList = new List({
        list: names,
        width: 500,
        height: 500,
        viewNum: 5,
        currentSelected: true,
        selectedColor: dark,
        selectedBackgroundColor: green,
        titleBar: new Label({ text: "Profesor", size: 30, color: light }),
        titleBarBackgroundColor: dark,
        titleBarHeight: 30,
        close: true,
        closeColor: red,
        draggable: false
    });
    nameList.addTo(entry);
    nameList.loc(1030, -30);
    nameList.currentValue = reserve.name;
    nameList.change(() => {
        entry.getChildAt(0).text = nameList.currentValue;
        app.changeReserveName(id, nameList.currentValue);
        nameList.dispose();
        nameList = null;
    });
}

// function showReserveTip(target) {
//     let addReserveTip = new Tip({
//         text: "Selecciona tu nombre en la lista, y\nmodifica el número de Chromebook que quieres reservar.",
//         outside: true,
//         target: target,
//         valign: "top",
//         align: "right"
//     });
//     addReserveTip.show(0, 4);
// }

function createSlotWindow(app, frame) {
    let slotEditWindow = new Pane({
        width: frame.width,
        height: frame.height,
        titleBar: new Label({
            text: "",
            size: 80,
            color: light
        }),
        corner: 0,
        backdropColor: light,
        backgroundColor: light,
        titleBarHeight: 100,
        titleBarColor: light,
        titleBarBackgroundColor: dark,
        close: true,
        closeColor: red,
        modal: false,
        backdropClose: false,
        displayClose: false
    });
    slotEditWindow.center();
    slotEditWindow.on("close", () => app.closeSlot());

    let reserveButton = new Button({
        label: new Label({ text: `Añadir reserva`, color: dark, size: 50 }),
        width: 600,
        height: 200,
        backgroundColor: green,
        rollBackgroundColor: orange,
    });
    reserveButton.on("click", () => {
        app.addReserve();
    });
    reserveButton.addTo(slotEditWindow).pos({ x: 0, horizontal: LEFT, vertical: BOTTOM }).mov(50, -50);

    let table = new Tile({
        obj: [],
        unique: true,
        width: 1600,
        cols: 1,
        rows: 0,
        spacingV: 20
    });
    table.loc(50, 150);
    table.addTo(slotEditWindow);

    return {
        window: slotEditWindow,
        button: reserveButton,
        table: table
    };
}

function updateSlotWindowTitleBar(slotWindow, day, hour) {
    slotWindow.window.titleBarLabel.text = `Reservas para: ${day} ${hour}`;
}

function createReserveList(app, slotSnapshot, day, hour) {
    let entries = [];
    if (slotSnapshot) {
        Object.keys(slotSnapshot).forEach((id, index) => {
            let entry = createReserveRow(app, id, slotSnapshot, day, hour);
            entries.push(entry);
            if (slotSnapshot[id].name === "") {
                createNameList(app, id, slotSnapshot[id], entry);
            }
        });
    }
    return entries;
}

function createReserveRow(app, id, slotSnapshot, day, hour) {
    let reserve = slotSnapshot[id];

    let nameBox = new Button({
        label: new Label({ text: reserve.name, size: 50 }),
        width: 500,
        height: 100,
        color: dark,
        backgroundColor: green,
        rollBackgroundColor: orange,
        corner: 0
    });
    nameBox.on("click", () => {
        createNameList(app, id, reserve, row);
    });

    let deleteButton = new Button({
        icon: pizzazz.makeIcon("close", red),
        width: 100,
        height: 100,
        color: red,
        backgroundColor: green,
        rollBackgroundColor: red,
        rollIcon: pizzazz.makeIcon("close", light)
    });
    deleteButton.on("click", () => {
        app.deleteReserve(id);
    })

    let stepper = new Stepper({
        min: 0,
        max: reserve.number + spareInSlot(slotSnapshot, day, hour),
        backgroundColor: green
    });

    let row = new Tile({
        obj: [deleteButton, nameBox, stepper],
        spacingH: 10,
        width: 1000,
        rows: 1,
        cols: 3,
        unique: true
    });

    stepper.currentValue = reserve.number;
    stepper.on("change", (e) => {
        app.changeReservedNumber(id, stepper.currentValue);
    });
    return row;
}

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
    gotoPreviousWeek() {
        console.log("No user logged in. Can't change dates.");
    }
    gotoToday() {
        console.log("No user logged in. Can't change dates.");
    }
    gotoNextWeek() {
        console.log("No user logged in. Can't change dates.");
    }
}

class ChooseSlot extends State {
    login() {
        console.log("Trying to log from ChooseSlot state.");
    }
    logout() {
        if (this.app.user) {
            this.app.authBackend.signOut();
        }
        this.chosenSlot = null;
        this.app.state = new NotLoggedIn(this.app);
        console.log("State: NotLoggedIn");
        console.log("No user logged in.");
    }
    syncDb(snapshot) {
        if (this.app.ui) {
            this.app.ui.syncDb(snapshot);
        }
    }
    gotoToday() {
        this.app.startDay = getFirstDayOfCurrentWeek();
        this.app.currentDays = getDaysFrom(this.app.startDay, 5);
        if (this.app.ui) {
            this.app.ui.updateDate(this.currentDays, this.app.db);
        }
    }
    gotoNextWeek() {
        this.app.startDay.setDate(this.app.startDay.getDate() + 7);
        this.app.currentDays = getDaysFrom(this.app.startDay, 5);
        if (this.app.ui) {
            this.app.ui.updateDate(this.currentDays, this.app.db);
        }
    }
    gotoPreviousWeek() {
        this.app.startDay.setDate(this.app.startDay.getDate() - 7);
        this.app.currentDays = getDaysFrom(this.app.startDay, 5);
        if (this.app.ui) {
            this.app.ui.updateDate(this.currentDays, this.app.db);
        }
    }
    openSlot(slot) {
        this.app.chosenSlot = slot;
        this.app.ui.openSlot(slot);
        this.app.dbBackend.ref(`/reserves/${slot.day}/${slot.hour}`).on("value", (snapshot) => {
            this.app.chosenSlot.reserves = snapshot.val();
            if (this.app.ui) {
                this.app.ui.syncSlot(snapshot.val());
            }
        });
        this.app.state = new EditSlot(this.app);
    }
}

class EditSlot extends State {
    addReserve() {
        let day = this.app.chosenSlot.day;
        let hour = this.app.chosenSlot.hour;
        if (spareInSlot(this.app.chosenSlot.reserves, day, hour) > 0) {
            let reserve = new Reserve(
                this.app.chosenSlot.day,
                this.app.chosenSlot.hour,
                iniciales(this.app.user.email),
                spareInSlot(this.app.chosenSlot.reserves, day, hour));
            let id = this.app.dbBackend.ref(`/reserves/${day}/${hour}`).push();
            id.set(reserve);
            return id;
        }
    }
    deleteReserve(id) {
        this.app.dbBackend.ref(`/reserves/${this.app.chosenSlot.day}/${this.app.chosenSlot.hour}/${id}`).remove();
    }
    changeReservedNumber(id, number) {
        let slot = this.app.chosenSlot;
        let reserve = slot.reserves[id];
        reserve.number = number;
        let updates = {};
        updates[`/reserves/${slot.day}/${slot.hour}/${id}`] = reserve;
        this.app.dbBackend.ref().update(updates);
    }
    changeReserveName(id, name) {
        let slot = this.app.chosenSlot;
        let reserve = slot.reserves[id];
        reserve.name = name;
        let updates = {};
        updates[`/reserves/${slot.day}/${slot.hour}/${id}`] = reserve;
        this.app.dbBackend.ref().update(updates);
    }
    closeSlot() {
        if (this.app.ui) {
            this.app.ui.closeSlot();
        }
        this.app.dbBackend.ref(`/reserves/${this.app.chosenSlot.day}/${this.app.chosenSlot.hour}`).off();
        this.app.chosenSlot = null;
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
    syncDb(snapshot) {
        if (this.app.ui) {
            this.app.ui.syncDb(snapshot);
        }
    }
}

class App {
    constructor(authBackend, dbBackend, poolRules, startDay, currentDays) {
        this.authBackend = authBackend;
        this.dbBackend = dbBackend;
        this.db = {};
        this.poolRules = poolRules;
        this.startDay = startDay;
        this.currentDays = currentDays;
        this.ui = null;
        this.user = null;
        this.state = ((this.user) ?
            new ChooseSlot(this) :
            new NotLoggedIn(this));
        this.chosenSlot = null;

        this.dbBackend.ref("/reserves").on("value", (snapshot) => {
            this.db = snapshot.val();
            console.log("Updating local db...");
            this.state.syncDb(snapshot.val());
        });

        this.authBackend.onAuthStateChanged(userCredentials => {
            this.user = userCredentials;
            this.state = ((this.user) ?
                new ChooseSlot(this) :
                new NotLoggedIn(this));
            this.state.syncDb(this.db);
            if (this.ui) {
                this.ui.changeUser(this.user);
            }
        });
    }
    login() {
        this.state.login();
    }
    logout() {
        if (this.user) {
            this.authBackend.signOut();
            this.user = null;
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
    openSlot(slot) {
        this.state.openSlot(slot);
    }
    closeSlot() {
        this.state.closeSlot();
    }
    addReserve() {
        this.state.addReserve();
    }
    deleteReserve(id) {
        this.state.deleteReserve(id);
    }
    changeReservedNumber(id, number) {
        this.state.changeReservedNumber(id, number);
    }
    changeReserveName(id, name) {
        this.state.changeReserveName(id, name);
    }
}
