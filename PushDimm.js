
const version = `v 0.1`
const scriptname = `push-dimm script`
const constri = `xenon-s`

// push-dimm script 

/* 
pathBrightness: Pfad zum DP, der die Lampe dimmt (in %)
pathSchalter: Pfad zum Schalter, der die Lampe an/aus schaltet (true/false)
pathLampe: Pfad zum DP, der den Zustand der Lampe zurück gibt
pathDimmer: Pfad vom Taster, der die Lampe dimmt
pathZustand: Pfad kann frei erstellt werden. (dient nur zum Zwischenspeichern, ob gesenkt oder erhöht werden soll)
dimmLvl: Wert, um den die Helligkeit verändert werden soll
dimmIntervall: Wert in MS, um den die Helligkeit verändert werden soll
*/

const arrOriginal = [
    // Objekt 1 - Arbeitszimmer Deckenlampe
    {
        pathBrightness: `zigbee.0.680ae2fffe5d728d.brightness`,
        pathSchalter: `zigbee.0.ccccccfffeee567c.state`,
        pathLampe: `zigbee.0.680ae2fffe5d728d.state`,
        pathDimmer: `zigbee.0.ccccccfffeee567c.up_button`,
        pathZustand: `0_userdata.0.Sammlungen.Beleuchtung.Arbeitszimmer.Deckenlampe.letzter_Zustand`,
        dimmLvl: 5,
        dimmIntervall: 100
    },
    // objekt 2 - Wohnzimmer Esstisch
    {
        pathBrightness: ``,
        pathSchalter: ``,
        pathLampe: ``,
        pathDimmer: ``,
        pathZustand: ``,
        dimmLvl: 5,
        dimmIntervall: 100
    },
];

// FINGER WEG 

console.log(`${scriptname} ${version} ${constri}`);

let min = 1;
let max = 100;

const arrChecked = await checkInput();
createTrigger(arrChecked);

async function checkInput() {
    let arrTemp = [];
    for (const i in arrOriginal) {
        if (getObject(arrOriginal[i].pathBrightness) !== null) {
            if (getObject(arrOriginal[i].pathSchalter) !== null) {
                if (getObject(arrOriginal[i].pathLampe) !== null) {
                    arrOriginal[i].intervall = null;
                    arrTemp.push(arrOriginal[i]);
                    if (getObject(arrOriginal[i].pathZustand) === null) {
                        createState(`${arrOriginal[i].pathZustand}`, JSON.parse('{"type":"string", "read":true, "def":"up", "write": false}'), function (str) {
                        });
                    };

                    arrOriginal[i].Intervall = null;
                } else {

                    delete arrOriginal[i];
                };
            } else {
                delete arrOriginal[i];
            };
        } else {
            delete arrOriginal[i];
        };
    };
    return arrTemp;

};

async function createTrigger(arrChecked) {
    arrChecked.forEach(function (objTemp) {
        on({ id: objTemp.pathSchalter, val: true, ack: true }, function async(obj) {    // Trigger Licht an / aus
            // Lichtschalter AN/AUS 
            const val = getState(objTemp.pathLampe);
            let value = false;
            value = val.val;

            switch (value) {
                case true: {
                    setState(objTemp.pathLampe, false);
                    break;
                };
                case false: {
                    setState(objTemp.pathLampe, true);
                    break;
                };
            };
        });

        on({ id: objTemp.pathDimmer, change: "any", ack: true }, async function (obj) {  // DIMM UP / DOWN
            // Dimmschalter AUF/AB
            const val = await getState(objTemp.pathDimmer);
            let value = true;
            value = val.val;

            const lastVal = await getState(objTemp.pathZustand);
            let lastValue = ``;
            lastValue = lastVal.val;

            let dimmerVal = await getState(objTemp.pathBrightness);
            let dimmerValue = 0;
            dimmerValue = dimmerVal.val;

            if (dimmerValue >= 100) {
                setState(objTemp.pathZustand, `down`, true);
            } else if (dimmerValue <= 1) {
                setState(objTemp.pathZustand, `up`, true);
            };

            if (objTemp.Intervall != null) {
                clearInterval(objTemp.Intervall);
                objTemp.Intervall = null;
            };

            let invertallMS = 0;
            invertallMS = objTemp.dimmIntervall;

            switch (value) { // => Taster gedrückt
                case true: {
                    if (lastValue === `up`) {    // wenn zuletzt push UP 
                        setState(objTemp.pathZustand, `down`, true);
                        if (dimmerValue >= min && dimmerValue <= max) {
                            if ((dimmerValue + objTemp.dimmLvl) < 100) {
                                objTemp.Intervall = setInterval(async () => {
                                    dimmerVal = await getState(objTemp.pathBrightness);
                                    dimmerValue = await dimmerVal.val;
                                    dimmerValue = dimmerValue + objTemp.dimmLvl;
                                    if ((dimmerValue + objTemp.dimmLvl) <= 100) {
                                        setState(objTemp.pathBrightness, dimmerValue);
                                    } else {
                                        setState(objTemp.pathBrightness, 100);
                                    };
                                    setState(objTemp.pathZustand, `down`, true);
                                    if (dimmerValue >= 100) {
                                        if (objTemp.Intervall != null) {
                                            clearInterval(objTemp.Intervall);
                                            objTemp.Intervall = null;
                                        };
                                    };
                                }, invertallMS);
                            } else {
                                if (objTemp.Intervall != null) {
                                    clearInterval(objTemp.Intervall);
                                    objTemp.Intervall = null;
                                };
                            };
                        };

                    } else if (lastValue === `down`) {    // wenn zuletzt push down 
                        setState(objTemp.pathZustand, `up`, true);
                        if (dimmerValue >= min && dimmerValue <= max) {
                            if ((dimmerValue - objTemp.dimmLvl) > 1) {
                                objTemp.Intervall = setInterval(async () => {
                                    dimmerVal = await getState(objTemp.pathBrightness);
                                    dimmerValue = await dimmerVal.val;
                                    dimmerValue = dimmerValue - objTemp.dimmLvl;
                                    if ((dimmerValue - objTemp.dimmLvl) >= 1) {
                                        setState(objTemp.pathBrightness, dimmerValue);
                                    } else {
                                        setState(objTemp.pathBrightness, 1);
                                    };
                                    setState(objTemp.pathZustand, `up`, true);
                                    if (dimmerValue <= 1) {
                                        if (objTemp.Intervall != null) {
                                            clearInterval(objTemp.Intervall);
                                            objTemp.Intervall = null;
                                        };
                                    };
                                }, invertallMS);

                            } else {
                                if (objTemp.Intervall != null) {
                                    clearInterval(objTemp.Intervall);
                                    objTemp.Intervall = null;
                                };
                                setState(objTemp.pathZustand, `up`, true);
                            };
                        };
                    };
                };
            };
        });
    });
};


