// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var firebaseConfig = {
    apiKey: "AIzaSyAees7KpfcCjq-3Q5eyLZvTrWF9xQHnSGc",
    authDomain: "quierochromebooks.firebaseapp.com",
    databaseURL: "https://quierochromebooks.firebaseio.com",
    projectId: "quierochromebooks",
    storageBucket: "quierochromebooks.appspot.com",
    messagingSenderId: "54381478085",
    appId: "1:54381478085:web:4e87e94683bdd79dee70ac",
    measurementId: "G-J93XLE0X0B"
};

const appConfig = {
    dayHourHeights: [90, 75, 105, 45, 90, 90, 90, 90, 90],
    dayHours: ["8:30 - 9:30", "9:30 - 10:20", "10:20 - 11:30",
        "11:30 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00",
        "15:00 - 16:00", "16:00 - 17:00"],
    monthsAbbr: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    maxPoolSize: 31,
    names: ["MPP", "JSC", "MVR", "JRR", "JFA", "ASM", "RSG", "DGX", "PSB", "LMM"],
    poolSizeColorScale: {
        0: dark,
        10: red,
        28: brown,
        other: green
    },
    weekDays: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    weekDaysAbbr: ["D", "L", "M", "X", "J", "V", "S"],

};

const frameConfig = {
    scaling: "fit", // fit scales to fit the browser window while keeping the aspect ratio
    width: 1920,
    height: 1080,
    color: light,
    outerColor: dark,
    assets: ["chromebook.png"]
};

export {
    appConfig,
    firebaseConfig,
    frameConfig
};