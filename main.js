"use strict";

// 配列
let array;
// const ARRAY_LENGTH = 500;
const ARRAY_LENGTH = 1000;
const PARALLEL_PROCESS_QTY_MAX = 100;

// 描画先オブジェクト
let canvas;
let context;
// 座標
const GRAPH_UPPERLEFT_X = 0;
const GRAPH_UPPERLEFT_Y = 0;
// const BAR_UNIT_HEIGHT = 1;
const BAR_UNIT_HEIGHT = 1 / 3;
const BAR_WIDTH = 1;
// const BAR_WIDTH = 1 / 2;
const GRAPH_WIDTH = BAR_WIDTH * ARRAY_LENGTH;
const GRAPH_HEIGHT = BAR_UNIT_HEIGHT * ARRAY_LENGTH;
// 色
const COLOR_BACKGROUND = "black";
const COLOR_BAR = "white";
const COLOR_BAR_ACCESSED = "red";
const COLOR_BAR_SORTED = "lime";

// フレーム数
let frame = 0;
// 音声
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let gainNode;
const FREQUENCY_BASE = 400;
// const FREQUENCY_UNIT = 5;
const FREQUENCY_UNIT = 1;
const SOUND_VOLUME = 1;
// 音の波形
// const OSCILLATOR_TYPE = "sin";
// const OSCILLATOR_TYPE = "square";
// const OSCILLATOR_TYPE = "sawtooth";
const OSCILLATOR_TYPE = "triangle";

// 処理手順のキュー
let processAdministratorQueue;
let processAdministrator;





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



/* 描画方法を通知するためのクラス. */
class Notifyer {
    constructor(idx, value, color) {
        this.idx = idx;
        this.value = value;
        this.color = color;
        this.skip = false;  // この通知をフレームの最後の描画とするか否か
    }
}



/* プロセスの実行を管理するためのクラス. */
class ProcessAdministrator {
    constructor(processClass, parallelQty) {
        this.processClass = processClass;
        this.parallelQty = parallelQty;
    }

    /* プロセス実行直前に初期化する. */
    init() {
        this.process = new this.processClass();
        this.generator = this.process.update();
    }

    /* processを実行し, 描画について管理する.
    返り値はプロセスが終了したか否か. */
    update() {
        for (let i = 0; i < this.parallelQty; i++) {
            let ret = this.generator.next();
            let isFinished = ret.done;
            if (isFinished) {
                return true;
            } else {
                // notifyerを処理する
                let notifyer = ret.value;
                let idx = notifyer.idx;
                let color = notifyer.color;
                // idxが不適切な場合通知
                if (!(0 <= idx && idx < ARRAY_LENGTH)) {
                    console.log("idx: " + String(idx));
                }
                // arrayに描画するよう伝える
                array.colorStack.push([idx, color]);
                array.frequencies.push(calcFrequency(idx));
            }
        }
    }
}





/* 配列の処理をするためのクラス. */
class Process {
    constructor() {
    }

    /* バーの色を初期化する. */
    initColor() {
        array.colors.fill(COLOR_BAR);
    }

    /* 配列への処理を記述.
    配列のアクセスのたびにNotifyerオブジェクトをyieldする.
    処理終了時にはreturnする. */
    *update() {
        return;
    }

    /* 配列の要素へのアクセスを通知する */
    notify(idx) {
        let ret = new Notifyer(idx, array.array[idx], COLOR_BAR_ACCESSED);
        return ret;
    }

}

/* ソートが成功したか確認する. */
class CheckSorted extends Process {
    constructor() {
        super();
        this.initColor();
    }

    /* 配列へのアクセスごとにyield. */
    *update() {
        for (let i = 0; i < ARRAY_LENGTH - 1; i++) {
            // 右側の要素へのアクセス
            let notifyer = new Notifyer(i, array.array[i], COLOR_BAR_ACCESSED);
            yield notifyer;
            // 左側の要素へのアクセス
            let idx = randint(ARRAY_LENGTH);
            notifyer = new Notifyer(i + 1, array.array[i + 1], COLOR_BAR_ACCESSED);
            yield notifyer;
            if (array.array[i] <= array.array[i + 1]) {
                // 大小関係が適切な場合
                array.colors[i] = COLOR_BAR_SORTED;
            } else {
                // 大小関係が不適切な場合
                console.log("unsorted")
                return;
            }
        }
        array.colors[ARRAY_LENGTH - 1] = COLOR_BAR_SORTED;
        return;
    }
}

/* 配列の要素をシャッフルする. */
class Shuffle extends Process {
    constructor() {
        super();
        this.initColor();
    }

    /* 配列へのアクセスごとにyield. */
    *update() {
        for (let i = 0; i < ARRAY_LENGTH; i++) {
            // 入れ替え元の要素へのアクセス
            let notifyer = new Notifyer(i, array.array[i], COLOR_BAR_ACCESSED);
            yield notifyer;
            // 入れ替え先の要素へのアクセス
            let idx = randint(ARRAY_LENGTH);
            notifyer = new Notifyer(idx, array.array[idx], COLOR_BAR_ACCESSED);
            yield notifyer;
            array.swap(i, idx);
        }
        return;
    }

}

/* ソートをするクラス. */
class Sort extends Process {
    constructor() {
        super();
        this.initColor();
    }

    /* 配列へのアクセスごとにyield. */
    *update() {

    }
}

/* バブルソートをする. */
class BubbleSort extends Sort {
    constructor() {
        super();
        console.log("bubble");
    }

    /* 配列へのアクセスごとにyield. */
    *update() {
        for (let i = ARRAY_LENGTH - 1; i >= 0; i--) {
            for (let j = 0; j < i; j++) {
                let notifyer = new Notifyer(j, array.array[j], COLOR_BAR_ACCESSED);
                yield notifyer;
                notifyer = new Notifyer(j + 1, array.array[j + 1], COLOR_BAR_ACCESSED);
                yield notifyer;
                if (array.array[j] > array.array[j + 1]) {
                    array.swap(j, j + 1);
                }
            }
        }
        return;
    }

}

/* 選択ソートをする. */
class SelectionSort extends Sort {
    constructor() {
        super();
        console.log("Selection")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update() {
        for (let i = 0; i < ARRAY_LENGTH; i++) {
            let minIdx = i;
            for (let j = i + 1; j < ARRAY_LENGTH; j++) {
                let notifyer = new Notifyer(minIdx, array.array[minIdx], COLOR_BAR_ACCESSED);
                yield notifyer;
                notifyer = new Notifyer(j, array.array[j], COLOR_BAR_ACCESSED);
                yield notifyer;
                if (array.array[minIdx] > array.array[j]) {
                    minIdx = j;
                }
            }
            array.swap(i, minIdx);
        }
        return;
    }
}

/* 挿入ソートをする. */
class InsertionSort extends Sort {
    constructor() {
        super();
        console.log("Insertion")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update() {
        for (let i = 1; i < ARRAY_LENGTH; i++) {
            let notifyer = new Notifyer(i, array.array[i], COLOR_BAR_ACCESSED);
            yield notifyer;
            notifyer = new Notifyer(i - 1, array.array[i - 1], COLOR_BAR_ACCESSED);
            yield notifyer;

            // 整列済みの先頭より大きい場合
            if (array.array[i - 1] > array.array[i]) {
                let tmp = array.array[i];
                let j;
                // 挿入すべきインデックスを探索し, jとする
                for (j = i; (j > 0 && array.array[j - 1] > tmp); j--) {
                    notifyer = new Notifyer(j - 1, array.array[j - 1], COLOR_BAR_ACCESSED);
                    yield notifyer;
                    array.array[j] = array.array[j - 1];
                }
                notifyer = new Notifyer(j, array.array[j], COLOR_BAR_ACCESSED);
                yield notifyer;
                array.array[j] = tmp;
            }
        }
        return;

    }
}

/* マージソートをする. */
class MergeSort extends Sort {
    constructor() {
        super();
        console.log("Merge")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update(left = 0, right = ARRAY_LENGTH) {
        if (right - left == 1) {

        } else {
            let mergedArray = Array(right - left);
            let mid = left + Math.floor((right - left) / 2);
            yield* this.update(left, mid);
            yield* this.update(mid, right);
            let i = left;
            let j = mid;
            let idx = 0;
            // ２つの区分を比較
            while (i < mid && j < right) {
                yield this.notify(i);
                yield this.notify(j);
                if (array.array[i] <= array.array[j]) {
                    mergedArray[idx] = array.array[i];
                    i++;
                } else {
                    mergedArray[idx] = array.array[j];
                    j++;
                }
                idx++
            }
            // 残った区分を結合
            while (i < mid) {
                mergedArray[idx] = array.array[i];
                i++;
                idx++;
            }
            while (j < right) {
                mergedArray[idx] = array.array[j];
                j++;
                idx++;
            }

            // 元の配列に反映
            for (let idx = 0; idx < mergedArray.length; idx++) {
                array.array[idx + left] = mergedArray[idx];
                yield this.notify(idx + left);
            }
        }

        // ソート完了時
        if (right - left == ARRAY_LENGTH) {
            return;
        }
    }
}

/* ストゥージソートをする. */
class StoogeSort extends Sort {
    constructor() {
        super();
        console.log("Stooge")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update(left = 0, right = ARRAY_LENGTH) {
        yield this.notify(left);
        yield this.notify(right - 1);
        if (array.array[left] > array.array[right - 1]) {
            array.swap(left, right - 1);
        }
        if (right - left >= 3) {
            let t = Math.floor((right - left) / 3);
            yield* this.update(left, right - t);
            yield* this.update(left + t, right);
            yield* this.update(left, right - t);
        }

        // ソート完了時
        if (right - left == ARRAY_LENGTH) {
            return;
        }
    }
}

/* シェーカーソートをする. */
class ShakerSort extends Sort {
    constructor() {
        super();
        console.log("Shaker")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update() {
        let topIdx = 0;
        let botIdx = ARRAY_LENGTH - 1;
        while (true) {
            let lastSwapIdx = 0;

            // 順方向の走査
            for (let i = topIdx; i < botIdx; i++) {
                yield this.notify(i);
                yield this.notify(i + 1);
                if (array.array[i] > array.array[i + 1]) {
                    array.swap(i, i + 1);
                    lastSwapIdx = i;
                }
            }
            // 後方の走査範囲を短縮する
            botIdx = lastSwapIdx;

            if (topIdx == botIdx) {
                break;
            }

            // 逆方向の走査
            for (let i = botIdx; i > topIdx; i--) {
                yield this.notify(i);
                yield this.notify(i - 1);
                if (array.array[i - 1] > array.array[i]) {
                    array.swap(i - 1, i);
                    lastSwapIdx = i;
                }
            }
            // 前方の捜査範囲を短縮する
            topIdx = lastSwapIdx;

            if (topIdx == botIdx) {
                break;
            }
        }

        return;
    }
}

/* クイックソートをする. */
class QuickSort extends Sort {
    constructor() {
        super();
        console.log("Quick")
    }

    /* 配列へのアクセスごとにyieldする. */
    *update(left = 0, right = ARRAY_LENGTH) {
        if (right - left <= 1) {

        } else {
            let pivotIdx = randint(right - left) + left;
            let pivot = array.array[pivotIdx];
            yield this.notify(pivotIdx);
            let l = left;   // pivot以下の要素
            let r = right - 1;  // pivot超の要素
            while (true) {
                while (l < ARRAY_LENGTH && array.array[l] <= pivot) {
                    yield this.notify(l);
                    l++
                }
                if (l < ARRAY_LENGTH) {
                    yield this.notify(l);
                }
                while (r >= 0 && array.array[r] > pivot) {
                    yield this.notify(r);
                    r--;
                }
                yield this.notify(r);


                if (l < r) {
                    // 交換できる場合
                    array.swap(l, r);
                    l++;
                    r--;
                } else {
                    break;
                }
            }
            yield* this.update(left, l);
            yield* this.update(l, right);
        }

        if (right - left == ARRAY_LENGTH) {
            return;
        }
    }
}

/* ヒープソートをする. */
class HeapSort extends Sort {
    constructor() {
        super();
        console.log("Heap")
    }
    /* idxとその子がヒープの条件を満たしているか否か */
    isHeapified(idx, heapLength) {
        let left = 2 * idx + 1;
        let right = 2 * idx + 2;
        let ret =
            (left >= heapLength) ||
            (left == heapLength - 1 &&
                array.array[idx] >= array.array[left]) ||
            (right < heapLength &&
                array.array[idx] >= array.array[left] &&
                array.array[idx] >= array.array[right])
        return ret;
    }

    /* 子がヒープになっているarray.array[idx]の要素をヒープにする */
    *heapify(idx, heapLength) {
        // idxとその子がヒープの条件を満たしていない場合
        while (!this.isHeapified(idx, heapLength)) {
            let left = idx * 2 + 1;
            let right = idx * 2 + 2;
            let maxIdx;
            yield this.notify(idx);
            yield this.notify(left);
            if (left == heapLength - 1) {
                // 子が1つのみの場合
                maxIdx = left;
            } else {
                // 子が2つの場合
                yield this.notify(right);

                if (array.array[left] >= array.array[right]) {
                    maxIdx = left;
                } else {
                    maxIdx = right;
                }
            }
            array.swap(idx, maxIdx);
            idx = maxIdx;
        }
    }

    /* 配列へのアクセスごとにyieldする. */
    *update() {
        // ヒープ構築
        for (let i = ARRAY_LENGTH - 1; i >= 0; i--) {
            yield* this.heapify(i, ARRAY_LENGTH);
        }

        // ヒープをもとにソート
        for (let i = ARRAY_LENGTH - 1; i >= 0; i--) {
            array.swap(0, i);
            yield* this.heapify(0, i);
        }

        return;
    }
}




/* 0以上a未満の整数値をランダムに生成する. */
function randint(a) {
    let ret = Math.floor(a * Math.random());
    return ret;
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
    // gainNodeの設定をする
    gainNode.gain.value = SOUND_VOLUME;

    // oscillatorをarrayに追加する
    for (let i = 0; i < PARALLEL_PROCESS_QTY_MAX; i++) {
        array.oscillators.push(makeOscillator(0));
        // array.oscillators[i].start();
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
    gainNode.gain.value = 1 / processAdministrator.parallelQty * SOUND_VOLUME;
    console.log(gainNode.gain.value);
    // gainNode.gain.value = frame * SOUND_VOLUME;

    for (let i = 0; i < PARALLEL_PROCESS_QTY_MAX; i++) {
        // array.oscillators[i].connect(gainNode);
        if (i < array.frequencies.length) {
            array.oscillators[i].frequency.value = array.frequencies[i];
        } else {
            array.oscillators[i].frequency.value = 0;
        }
    }

    array.frequencies.length = 0;

}





/* 初期化する. */
function init() {
    array = new MyArray();


    // 画面描画について初期化する.
    InitDraw();

    // oscillatorを初期化する
    initOscillator();

    // プロセスの管理について初期化する
    processAdministratorQueue = [
        new ProcessAdministrator(Shuffle, 10),
        // new ProcessAdministrator(BubbleSort, 30),
        // new ProcessAdministrator(SelectionSort, 30),
        // new ProcessAdministrator(InsertionSort, 40),
        // new ProcessAdministrator(MergeSort, 10),
        // new ProcessAdministrator(StoogeSort, 100),
        // new ProcessAdministrator(ShakerSort, 20),
        new ProcessAdministrator(QuickSort, 10),
        // new ProcessAdministrator(HeapSort, 10),


        new ProcessAdministrator(CheckSorted, 10)
    ];

    processAdministrator = processAdministratorQueue.shift();
    processAdministrator.init();



}





/* 更新する. */
function update() {
    // プロセス終了時
    if (processAdministrator.update()) {
        // 実行待ちプロセスがない場合
        if (processAdministratorQueue.length == 0) {
            processAdministratorQueue.push(new ProcessAdministrator(Process, 1));
        }
        // 新たなプロセスの開始
        processAdministrator = processAdministratorQueue.shift();
        processAdministrator.init();
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
