// ======================================
// МЕНЕДЖЕР ТАЙМЕРІВ
// ======================================

function createTimerManager() {

    // Масив таймерів
    let timers = [];

    // ID таймерів
    let timerId = 0;

    // Стан паузи
    let paused = false;



    // Створення timeout

    function setCustomTimeout(
        callback,
        delay
    ) {

        const id = ++timerId;

        const timer = {

            id,

            type: "timeout",

            callback,

            delay,

            remaining: delay,

            start: Date.now(),

            timeoutId: null
        };

        timer.timeoutId =
            setTimeout(() => {

                callback();

                timers = timers.filter(
                    t => t.id !== id
                );

                renderTimers();

            }, delay);

        timers.push(timer);

        renderTimers();

        return id;
    }



    // Створення interval

    function setCustomInterval(
        callback,
        delay
    ) {

        const id = ++timerId;

        const intervalId =
            setInterval(() => {

                callback();

            }, delay);

        timers.push({

            id,

            type: "interval",

            callback,

            delay,

            intervalId
        });

        renderTimers();

        return id;
    }



    // Видалення таймера

    function clear(id) {

        const timer =
            timers.find(
                t => t.id === id
            );

        if (!timer) return;

        if (
            timer.type === "timeout"
        ) {

            clearTimeout(
                timer.timeoutId
            );
        }

        if (
            timer.type === "interval"
        ) {

            clearInterval(
                timer.intervalId
            );
        }

        timers = timers.filter(
            t => t.id !== id
        );

        renderTimers();
    }



    // Видалення всіх таймерів

    function clearAll() {

        timers.forEach(timer => {

            if (
                timer.type === "timeout"
            ) {

                clearTimeout(
                    timer.timeoutId
                );
            }

            if (
                timer.type === "interval"
            ) {

                clearInterval(
                    timer.intervalId
                );
            }
        });

        timers = [];

        renderTimers();
    }



    // Пауза

    function pause() {

        if (paused) return;

        paused = true;

        timers.forEach(timer => {

            if (
                timer.type === "timeout"
            ) {

                clearTimeout(
                    timer.timeoutId
                );

                timer.remaining -=
                    Date.now()
                    - timer.start;
            }

            if (
                timer.type === "interval"
            ) {

                clearInterval(
                    timer.intervalId
                );
            }
        });

        addQueueLog(
            "Таймери поставлено на паузу"
        );

        renderTimers();
    }



    // Продовження

    function resume() {

        if (!paused) return;

        paused = false;

        timers.forEach(timer => {

            if (
                timer.type === "timeout"
            ) {

                timer.start =
                    Date.now();

                timer.timeoutId =
                    setTimeout(() => {

                        timer.callback();

                        timers =
                            timers.filter(
                                t =>
                                    t.id !== timer.id
                            );

                        renderTimers();

                    }, timer.remaining);
            }

            if (
                timer.type === "interval"
            ) {

                timer.intervalId =
                    setInterval(() => {

                        timer.callback();

                    }, timer.delay);
            }
        });

        addQueueLog(
            "Таймери продовжено"
        );

        renderTimers();
    }



    // Активні таймери

    function getActive() {

        return timers;
    }



    // Стан паузи

    function isPaused() {

        return paused;
    }



    return {

        setTimeout:
            setCustomTimeout,

        setInterval:
            setCustomInterval,

        clear,

        clearAll,

        pause,

        resume,

        getActive,

        isPaused
    };
}



// ======================================
// СТВОРЕННЯ МЕНЕДЖЕРА
// ======================================

const manager =
    createTimerManager();



// ======================================
// КНОПКИ
// ======================================

// Створення таймера

document
    .getElementById("startTimer")
    .addEventListener("click", () => {

        manager.setTimeout(() => {

            addQueueLog(
                "Таймер завершено"
            );

        }, 5000);

    });



// Пауза

document
    .getElementById("pauseTimers")
    .addEventListener("click", () => {

        manager.pause();

    });



// Продовження

document
    .getElementById("resumeTimers")
    .addEventListener("click", () => {

        manager.resume();

    });



// Очищення

document
    .getElementById("clearAll")
    .addEventListener("click", () => {

        manager.clearAll();

        addQueueLog(
            "Всі таймери очищені"
        );

    });



// ======================================
// ВІДОБРАЖЕННЯ ТАЙМЕРІВ
// ======================================

function renderTimers() {

    const timerList =
        document.getElementById(
            "timerList"
        );

    timerList.innerHTML = "";

    manager
        .getActive()
        .forEach(timer => {

            const li =
                document.createElement("li");

            // Timeout

            if (
                timer.type === "timeout"
            ) {

                let remaining;

                // Якщо пауза
                if (
                    manager.isPaused()
                ) {

                    remaining =
                        timer.remaining;
                }

                // Якщо працює
                else {

                    remaining =
                        timer.remaining -
                        (
                            Date.now()
                            - timer.start
                        );
                }

                if (remaining < 0) {

                    remaining = 0;
                }

                const seconds =
                    Math.ceil(
                        remaining / 1000
                    );

                li.textContent =
                    `Таймер ID:
                     ${timer.id}
                     | Залишилось:
                     ${seconds} сек`;
            }

            // Interval

            else {

                li.textContent =
                    `Таймер ID:
                     ${timer.id}
                     | Повторюваний`;
            }

            timerList.appendChild(li);

        });
}



// ======================================
// ОНОВЛЕННЯ ІНТЕРФЕЙСУ
// ======================================

setInterval(() => {

    renderTimers();

}, 200);



// ======================================
// ASYNC ЧЕРГА
// ======================================

function createQueue(
    concurrency = 1
) {

    let queue = [];

    let activeCount = 0;

    let paused = false;

    let drainCallback = null;

    let completed = 0;



    // Наступна задача

    function next() {

        if (
            paused ||
            activeCount >= concurrency ||
            queue.length === 0
        ) {

            if (
                queue.length === 0 &&
                activeCount === 0 &&
                drainCallback
            ) {

                drainCallback();
            }

            updateStats();

            return;
        }

        const task =
            queue.shift();

        activeCount++;

        updateStats();

        task()
            .then(() => {

                activeCount--;

                completed++;

                updateStats();

                next();

            });
    }



    // Додавання задачі

    function add(asyncFn) {

        queue.push(asyncFn);

        updateStats();

        next();
    }



    // Пауза черги

    function pause() {

        paused = true;
    }



    // Продовження черги

    function resume() {

        paused = false;

        next();
    }



    // Callback пустої черги

    function onDrain(fn) {

        drainCallback = fn;
    }



    // Статистика

    function getStats() {

        return {

            completed,

            inQueue:
                queue.length,

            active:
                activeCount
        };
    }



    return {

        add,

        pause,

        resume,

        onDrain,

        getStats
    };
}



// ======================================
// СТВОРЕННЯ ЧЕРГИ
// ======================================

const queue =
    createQueue(2);



// Додавання задачі

document
    .getElementById("addTask")
    .addEventListener("click", () => {

        queue.add(async () => {

            addQueueLog(
                "Задача почалась"
            );

            await new Promise(resolve =>

                setTimeout(
                    resolve,
                    3000
                )
            );

            addQueueLog(
                "Задача завершена"
            );

        });

    });



// Пауза черги

document
    .getElementById("pauseQueue")
    .addEventListener("click", () => {

        queue.pause();

        addQueueLog(
            "Черга на паузі"
        );

    });



// Продовження черги

document
    .getElementById("resumeQueue")
    .addEventListener("click", () => {

        queue.resume();

        addQueueLog(
            "Черга продовжена"
        );

    });



// Callback пустої черги

queue.onDrain(() => {

    addQueueLog(
        "Черга порожня"
    );

});



// Додавання логів

function addQueueLog(text) {

    const queueLog =
        document.getElementById(
            "queueLog"
        );

    const li =
        document.createElement("li");

    li.textContent = text;

    queueLog.appendChild(li);

    updateStats();
}



// Оновлення статистики

function updateStats() {

    const stats =
        queue.getStats();

    console.log(

        "Оброблено:",
        stats.completed,

        "| В черзі:",
        stats.inQueue,

        "| Активних:",
        stats.active
    );
}