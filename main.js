"use strict";

// 配列
let array;
const ARRAY_LENGTH = 300;
const PARALLEL_PROCESS_QTY_MAX = 100;
// 描画先オブジェクト
let canvas;
let context;
const GRAPH_UPPERLEFT_X = 0;
const GRAPH_UPPERLEFT_Y = 0;
const BAR_UNIT_HEIGHT = 1;
const BAR_WIDTH = 1;
const GRAPH_WIDTH = BAR_WIDTH * ARRAY_LENGTH;
const GRAPH_HEIGHT = BAR_UNIT_HEIGHT * ARRAY_LENGTH;
const COLOR_BACKGROUND = "black";
const COLOR_BAR = "white";
const COLOR_BAR_ACCESSED = "red";
const COLOR_BAR_SORTED = "lime";

// フレーム数
let frame = 0;
// 音声
// web audio api contextを作成する
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let gainNode;
const FREQUENCY_BASE = 400;
const FREQUENCY_UNIT = 5;
const SOUND_VOLUME = 0.2;
// const OSCILLATOR_TYPE = "sin";
const OSCILLATOR_TYPE = "square";
// const OSCILLATOR_TYPE = "sawtooth";
// const OSCILLATOR_TYPE = "triangle";
// 処理手順のキュー
let processQueue;
// 実行中の処理
let process;
let parallelQty;



class MyArray {
    constructor() {
        this.array = Array(ARRAY_LENGTH);   // 配列の実体
        this.colors = Array(ARRAY_LENGTH);  // 表示色
        this.colorStack = []  // 一時的な色, [インデックス, 表示色]
        this.oscillators = []   // 鳴動させるoscillator
        this.frequencies = [];  // 鳴動させる周波数
        for (let i = 0; i < ARRAY_LENGTH; i++) {
            this.array[i] = i + 1;
            this.colors[i] = COLOR_BAR;
        }
    }

    /* ２つの要素をスワップする. */
    swap(x, y) {
        let tmp = this.array[x];
        this.array[x] = this.array[y];
        this.array[y] = tmp;
    }



}





/* 配列の処理をするためのクラス. */
class Process {
    constructor() {
        this.isFinished = false;
    }

    /* バーの色を初期化する. */
    initColor() {
        array.colors.fill(COLOR_BAR);
    }

    /* 1フレームの処理内容を記述 */
    update() {
        /* processが終了した場合trueにする. */
        this.isFinished = true;
        /* 次のフレームに処理を任せたい場合trueを返す. */
        return false;
    }

    /* アクセスを通知する */
    notifyAccess(idx) {
        if (!(0 <= idx && idx < ARRAY_LENGTH)) {
            console.log("idx: " + String(idx));
        }
        array.colorStack.push([idx, COLOR_BAR_ACCESSED]);
        array.frequencies.push(calcFrequency(idx));
    }
}

class CheckSorted extends Process {
    constructor() {
        super();
        this.initColor();

        this.MODE_SELECT_IDX_1 = 0;
        this.MODE_SELECT_IDX_2 = 1;
        this.mode = this.MODE_SELECT_IDX_1;

        this.i = 0;
    }

    /* 更新する.
    返り値は処理が完了したか否か. */
    update() {
        switch (this.mode) {
            // 左側の要素の選択
            case this.MODE_SELECT_IDX_1:
                // 内部処理
                this.mode = this.MODE_SELECT_IDX_2;
                // 描画設定
                this.notifyAccess(this.i);
                break;
            // 右側の要素の選択
            case this.MODE_SELECT_IDX_2:
                // 内部処理 
                this.mode = this.MODE_SELECT_IDX_1;
                // 描画設定
                this.notifyAccess(this.i + 1);
                // パラメータ操作
                this.i++;
                break;
        }

        if (array.array[this.i] <= array.array[this.i + 1]) {
            // ソートされている場合
            array.colors[this.i] = COLOR_BAR_SORTED;
            this.isFinished = false;
        } else {
            // ソートされていない場合
            this.isFinished = true;
        }

        // 処理が完了した場合
        if (this.i == ARRAY_LENGTH - 1) {
            array.colors[this.i] = COLOR_BAR_SORTED;
            this.isFinished = true;
        }

        return false;

    }
}

/* 配列の要素をシャッフルする. */
class Shuffle extends Process {
    constructor() {
        super();
        this.initColor();

        this.MODE_SELECT_IDX_1 = 0;
        this.MODE_SELECT_IDX_2 = 1;
        this.mode = this.MODE_SELECT_IDX_1;

        this.i = 0;
        this.swapIdx1 = -1;
        this.swapIdx2 = -1;

    }


    swap() {
        array.swap(this.swapIdx1, this.swapIdx2);
    }

    /* 更新する.
    返り値は処理が完了したか否か. */
    update() {
        // 配列へのアクセス
        switch (this.mode) {
            // スワップする要素の選択
            case this.MODE_SELECT_IDX_1:
                // 内部処理
                this.swapIdx1 = this.i;
                this.mode = this.MODE_SELECT_IDX_2;
                // 描画設定
                this.notifyAccess(this.i);
                break;
            // スワップする要素をランダムに選択
            case this.MODE_SELECT_IDX_2:
                // 内部処理 
                let idx = randint(ARRAY_LENGTH);
                this.swapIdx2 = idx;
                this.mode = this.MODE_SELECT_IDX_1;
                // 描画設定
                this.notifyAccess(idx);
                // パラメータ操作
                this.i++;
                break;
        }

        // スワップ処理
        if (this.swapIdx1 != -1 && this.swapIdx2 != -1) {
            this.swap(this.swapIdx1, this.swapIdx2);
            this.swapIdx1 = -1;
            this.swapIdx2 = -1;
        }

        // 処理が完了した場合
        if (this.i == ARRAY_LENGTH) {
            this.isFinished = true;
        }

        return false;

    }
}

/* バブルソートをする. */
class BubbleSort extends Process {
    constructor() {
        super();
        this.initColor();

        this.MODE_SELECT_IDX_1 = 0;
        this.MODE_SELECT_IDX_2 = 1;
        this.mode = this.MODE_SELECT_IDX_1;

        this.i = ARRAY_LENGTH - 1;
        this.j = 0
        this.swapIdx1 = -1;
        this.swapIdx2 = -1;
        console.log("bubble");

    }


    swap() {
        array.swap(this.swapIdx1, this.swapIdx2);
    }

    /* 更新する.
    返り値は処理が完了したか否か. */
    update() {
        // 配列へのアクセス
        switch (this.mode) {
            // スワップする要素の選択
            case this.MODE_SELECT_IDX_1:
                // 内部処理
                this.swapIdx1 = this.j;
                this.mode = this.MODE_SELECT_IDX_2;
                // 描画設定
                this.notifyAccess(this.j);
                break;
            // スワップすべきか比較する
            case this.MODE_SELECT_IDX_2:
                // 内部処理 
                if (array.array[this.j] > array.array[this.j + 1]) {
                    this.swapIdx2 = this.j + 1;
                }
                this.mode = this.MODE_SELECT_IDX_1;
                // 描画設定
                this.notifyAccess(this.j + 1);

                // パラメータ操作
                this.j++
                break;
        }

        // スワップ処理
        if (this.swapIdx1 != -1 && this.swapIdx2 != -1) {
            this.swap(this.swapIdx1, this.swapIdx2);
            this.swapIdx1 = -1;
            this.swapIdx2 = -1;
        }

        // 入れ替えが一周した場合
        if (this.i == this.j) {
            this.i--;
            this.j = 0;
        }

        // 処理が完了した場合
        if (this.i == 0) {
            this.isFinished = true;
        }

        return false;

    }
}

/* 0以上a未満の整数値をランダムに生成する. */
function randint(a) {
    let ret = Math.floor(a * Math.random());
    return ret;
}





/* Processの実行を管理するためのクラス. */
class ProcessQueue {
    constructor(processes, parallelQties) {
        this.queue = processes;
        this.parallelQties = parallelQties;

    }

    // プロセスの追加
    push(process, parallelQty) {
        this.queue.push(process);
        this.parallelQties(parallelQty);
    }

    // プロセスの消去
    pop() {
        let ret = [-1, -1];
        if (this.queue.length != 0) {
            ret[0] = this.queue.shift();
            ret[1] = this.parallelQties.shift();
        } else {
            ret[0] = Process;
            ret[1] = 1;
        }

        return ret;
    }
}





/* array.array[idx]より周波数を計算する. */
function calcFrequency(idx) {
    let ret = FREQUENCY_BASE + FREQUENCY_UNIT * array.array[idx];
    return ret;
}

/* oscillatorを作成する. */
function makeOscillator(frequency) {
    let oscillator = audioCtx.createOscillator();
    // oscillatorとgain nodeを接続する
    oscillator.connect(gainNode);
    // oscillatorの設定をする
    oscillator.type = OSCILLATOR_TYPE;

    return oscillator;
}





/* 画面描画について初期化する. */
function InitDraw() {
    canvas = document.getElementById("main");
    context = canvas.getContext('2d');
}

/* oscillatorを初期化する. */
function initOscillator() {
    // web audio api contextを作成する
    audioCtx = new AudioContext();
    // gain nodeを作成する
    gainNode = audioCtx.createGain();

    // audioCtxとgain nodeを接続する
    gainNode.connect(audioCtx.destination);
    // // gainNodeの設定をする
    gainNode.gain.value = SOUND_VOLUME;

    // oscillatorをarrayに追加する
    for (let i = 0; i < PARALLEL_PROCESS_QTY_MAX; i++) {
        array.oscillators.push(makeOscillator(0));
        array.oscillators[i].start();
    }
}





/* arrayを描画する. */
function drawGraph() {
    // グラフ背景の表示
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(GRAPH_UPPERLEFT_X, GRAPH_UPPERLEFT_Y, GRAPH_WIDTH, GRAPH_HEIGHT);
    // バーの表示
    for (let i = 0; i < ARRAY_LENGTH; i++) {
        context.fillStyle = array.colors[i];
        context.fillRect(GRAPH_UPPERLEFT_X + BAR_WIDTH * i, GRAPH_HEIGHT - BAR_UNIT_HEIGHT * array.array[i],
            BAR_WIDTH, BAR_UNIT_HEIGHT * array.array[i]);
    }
    // 一時的な配色の適用
    while (array.colorStack.length != 0) {
        let i = array.colorStack[array.colorStack.length - 1][0];
        context.fillStyle = array.colorStack[array.colorStack.length - 1][1]
        context.fillRect(GRAPH_UPPERLEFT_X + BAR_WIDTH * i, GRAPH_HEIGHT - BAR_UNIT_HEIGHT * array.array[i],
            BAR_WIDTH, BAR_UNIT_HEIGHT * array.array[i]);
        array.colorStack.pop();
    }

}

/* arrayをもとに音を発生させる. */
function beepGraph() {
    for (let i = 0; i < PARALLEL_PROCESS_QTY_MAX; i++) {
        if (i < array.frequencies.length) {
            array.oscillators[i].frequency.value = array.frequencies[i];
        } else {
            array.oscillators[i].frequency.value = 0;
        }
    }
    gainNode.gain.value = PARALLEL_PROCESS_QTY_MAX / ARRAY_LENGTH * SOUND_VOLUME;
    array.frequencies.length = 0;

}





/* 初期化する. */
function init() {
    array = new MyArray();


    // 画面描画について初期化する.
    InitDraw();

    // oscillatorを初期化する
    initOscillator();

    let processes = [Shuffle, BubbleSort, CheckSorted]
    let parallelQties = [10, 100, 7];
    processQueue = new ProcessQueue(processes, parallelQties);
    let popped = processQueue.pop();

    process = new popped[0]()
    parallelQty = popped[1];



}





/* 更新する. */
function update() {
    for (let i = 0; i < parallelQty; i++) {
        // 次のフレームの描画に移りたい場合
        if (process.update()) {
            continue;
        }
        // processが終了したら, 次のプロセスにうつる.
        if (process.isFinished) {
            let popped = processQueue.pop();
            process = new popped[0]()
            parallelQty = popped[1];
            break;
        }

    }
}





/* 描画する. */
function draw() {
    drawGraph();
    beepGraph();
}





/* 1フレームごとに実行する. */
function run() {
    update();
    draw();
    frame++;
    window.requestAnimationFrame(run);
}





/* window読み込み完了時にここから実行される. */
window.onload = function () {
    init();
    window.requestAnimationFrame(run);
}
