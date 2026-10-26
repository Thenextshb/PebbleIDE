/**
 * "when pause clicked" scripts get to run before a project fully pauses.
 * Both the editor's and the packager's pause buttons use this.
 */

const STATUS_DONE = 4;
// A script that doesn't end on its own (like a forever loop) gets paused with everything else after this long
const TIME_LIMIT = 2000;

/**
 * Start the "when pause clicked" scripts.
 * @param {Runtime} runtime The runtime.
 * @param {function} onFinished Called once all of the scripts have finished, or the time limit is up.
 * It isn't called if no scripts started.
 * @returns {Thread[]} The scripts that started.
 */
const startPauseScripts = (runtime, onFinished) => {
    const threads = runtime.startHats('event_whenpauseclicked');
    if (!threads || threads.length === 0) return [];
    const startTime = Date.now();
    const check = () => {
        const running = threads.some(thread => thread.status !== STATUS_DONE && runtime.threads.includes(thread));
        if (running && Date.now() - startTime < TIME_LIMIT) return;
        runtime.removeListener('AFTER_EXECUTE', check);
        onFinished();
    };
    runtime.on('AFTER_EXECUTE', check);
    return threads;
};

export {
    startPauseScripts
};
