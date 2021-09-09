"use strict";

// 配列
let array;
const ARRAY_LENGTH = 50;
// 描画先オブジェクト
let canvas;
let context;
const GRAPH_UPPERLEFT_X = 0;
const GRAPH_UPPERLEFT_Y = 0;
const BAR_UNIT_HEIGHT = 5;
const BAR_WIDTH = 5;
const GRAPH_WIDTH = BAR_WIDTH * ARRAY_LENGTH;
const GRAPH_HEIGHT = BAR_UNIT_HEIGHT * ARRAY_LENGTH;
const COLOR_BACKGROUND = "black";
const COLOR_BAR = "white";
const COLOR_BAR_ACCESSED = "red";

// フレーム数
let frame = 0;
// 音声
// web audio api contextを作成する
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let oscillator;
let gainNode;
const FREQUENCY_BASE = 400;
const FREQUENCY_UNIT = 10;
// 処理手順のキュー
let processQueue;
// 実行中の処理
let process;



class MyArray {
    constructor() {
        this.array = Array(ARRAY_LENGTH);   // 配列の実体
        this.colors = Array(ARRAY_LENGTH);  // 表示色
        this.colorStack = []  // 一時的な色, [インデックス, 表示色]
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
        // oscillatorを初期化する
        initOscillator();
    }

    /* 1フレームの処理内容を記述 */
    update() {
        /* プロセス終了時にtrueを返す. */
        return true;
    }

    /* アクセスを通知する */
    notifyAccess(idx) {
        array.colorStack.push([idx, COLOR_BAR_ACCESSED]);
        changeFrequency(idx);
    }
}

/* 配列の要素をシャッフルする. */
class Shuffle extends Process {

    constructor() {
        super();
        this.MODE_SELECT_IDX_1 = 0;
        this.MODE_SELECT_IDX_2 = 1;
        this.mode = this.MODE_SELECT_IDX_1;

        this.i = 0;
        this.swapIdx1 = -1;
        this.swapIdx2 = -1;
        oscillator.start(0);

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
            oscillator.stop();
            return true;
        }

        return false;

    }
}

/* バブルソートをする. */
class BubbleSort extends Process {

    constructor() {
        super();
        this.MODE_SELECT_IDX_1 = 0;
        this.MODE_SELECT_IDX_2 = 1;
        this.mode = this.MODE_SELECT_IDX_1;

        this.i = ARRAY_LENGTH - 1;
        this.j = 0
        this.swapIdx1 = -1;
        this.swapIdx2 = -1;
        oscillator.start(0);
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
            oscillator.stop();
            return true;
        }

        return false;

    }
}

/* Processの実行を管理するためのクラス. */
class ProcessQueue {
    constructor(processes) {
        this.queue = processes;

    }

    // プロセスの追加
    push(process) {
        this.queue.push(process);
    }

    // プロセスの消去
    pop() {
        let ret;
        if (this.queue.length != 0) {
            ret = this.queue.shift();
        } else {
            ret = Process;
        }

        return ret;
    }
}

/* 0以上a未満の整数値をランダムに生成する. */
function randint(a) {
    let ret = Math.floor(a * Math.random());
    return ret;
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
    // oscillatorとgain nodeを作成する
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    // oscillatorとgain nodeを接続する
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    // oscillatorの設定をする
    oscillator.type = 'sin'
    gainNode.gain.value = 0.1;
}

/* array.array[idx]に応じて周波数を調節する. */
function changeFrequency(idx) {
    console.log(idx);
    console.log(FREQUENCY_BASE + FREQUENCY_UNIT * array.array[idx])
    oscillator.frequency.value = FREQUENCY_BASE + FREQUENCY_UNIT * array.array[idx];
}


/* 初期化する. */
function init() {
    // 画面描画について初期化する.
    InitDraw();

    // oscillatorを初期化する
    // initOscillator();

    array = new MyArray();
    let processes = [Shuffle, BubbleSort]
    processQueue = new ProcessQueue(processes);
    process = new (processQueue.pop())()


}




/* 更新する. */
function update() {
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }
    if (process.update()) {
        process = new (processQueue.pop())();
    }

    // oscillator.frequency.value++;
    // console.log(oscillator.frequency.value);
}

/* 配列を描画する. */
function draw_graph() {
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

/* 描画する. */
function draw() {
    draw_graph();
}

/* 1フレームごとに実行する. */
function run() {
    update();
    draw();
    frame++;
    window.requestAnimationFrame(run);


}

window.onload = function () {
    init();
    window.requestAnimationFrame(run);
}
