import QR8bitByte from "./Byte";
import QRUtil from "./Util";
import { getRSBlocks } from "./RSBlock";
import QRPolynomial from "./Polynomial";
import QRBitBuffer from "./BitBuffer";

const PAD0 = 0xEC;
const PAD1 = 0x11;

class QRModelClass {
    _moduleCount = 0;
    _dataCache = null;
    _dataList = [];
    _errorCorrectLevel;
    _typeNumber;
    _modules;

    constructor(typeNumber, errorCorrectLevel, data) {
        this._errorCorrectLevel = errorCorrectLevel;
        this._modules = null;
        this._typeNumber = typeNumber;
        this._moduleCount = 0;
        this._dataCache = null;
        this._dataList = [];

        if (data) {
            this.addData(data);
        }
    }

    isDark(row, col) {
        if (row < 0 || this._moduleCount <= row || col < 0 || this._moduleCount <= col) {
            throw new Error(row + "," + col);
        }
        return this._modules[row][col];
    }

    getModuleCount() {
        return this._moduleCount;
    }

    make() {
        this.makeImpl(false, this.getBestMaskPattern());
    }

    addData(data) {
        let newData = new QR8bitByte(data);
        this._dataList.push(newData);
        this._dataCache = null;
    }

    makeImpl(test, maskPattern) {
        this._moduleCount = this._typeNumber * 4 + 17;
        this._modules = new Array(this._moduleCount);
        for (let row = 0; row < this._moduleCount; row++) {
            this._modules[row] = new Array(this._moduleCount);
            for (let col = 0; col < this._moduleCount; col++) {
                this._modules[row][col] = null;
            }
        }
        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this._moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this._moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();

        this.setupTypeInfo(test, maskPattern);
        if (this._typeNumber >= 7) {
            this.setupTypeNumber(test);
        }
        if (this._dataCache == null) {
            this._dataCache = this.createData(this._typeNumber, this._errorCorrectLevel, this._dataList);
        }
        this.mapData(this._dataCache, maskPattern);
    }


    setupPositionProbePattern(row, col) {
        for (let r = -1; r <= 7; r++) {
            if (row + r <= -1 || this._moduleCount <= row + r) continue;
            for (let c = -1; c <= 7; c++) {
                if (col + c <= -1 || this._moduleCount <= col + c) continue;
                if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                    this._modules[row + r][col + c] = true;
                } else {
                    this._modules[row + r][col + c] = false;
                }
            }
        }
    }

    getBestMaskPattern() {
        let minLostPoint = 0;
        let pattern = 0;
        for (var i = 0; i < 8; i++) {
            this.makeImpl(true, i);
            let lostPoint = QRUtil.getLostPoint(this);
            if (i == 0 || minLostPoint > lostPoint) {
                minLostPoint = lostPoint; pattern = i;
            }
        }
        return pattern;
    }


    setupTimingPattern() {
        for (let r = 8; r < this._moduleCount - 8; r++) {
            if (this._modules[r][6] != null) { continue; }
            this._modules[r][6] = (r % 2 == 0);
        }
        for (let c = 8; c < this._moduleCount - 8; c++) {
            if (this._modules[6][c] != null) { continue; }
            this._modules[6][c] = (c % 2 == 0);
        }
    }

    setupPositionAdjustPattern() {
        let pos = QRUtil.getPatternPosition(this._typeNumber); for (var i = 0; i < pos.length; i++) {
            for (let j = 0; j < pos.length; j++) {
                let row = pos[i]; var col = pos[j];
                if (this._modules[row][col] != null) {
                    continue;
                }
                for (let r = -2; r <= 2; r++) {
                    for (let c = -2; c <= 2; c++) {
                        if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                            this._modules[row + r][col + c] = true;
                        } else {
                            this._modules[row + r][col + c] = false;
                        }
                    }
                }
            }
        }
    }

    setupTypeNumber(test) {
        let bits = QRUtil.getBCHTypeNumber(this._typeNumber);
        for (let i = 0; i < 18; i++) {
            let mod = (!test && ((bits >> i) & 1) == 1);
            this._modules[Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
        }
        for (let i = 0; i < 18; i++) {
            let mod = (!test && ((bits >> i) & 1) == 1);
            this._modules[i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
        }
    }

    setupTypeInfo(test, maskPattern) {
        let data = (this._errorCorrectLevel << 3) | maskPattern;
        let bits = QRUtil.getBCHTypeInfo(data);
        for (let i = 0; i < 15; i++) {
            let mod = (!test && ((bits >> i) & 1) == 1);
            if (i < 6) {
                this._modules[i][8] = mod;
            } else if (i < 8) {
                this._modules[i + 1][8] = mod;
            } else {
                this._modules[this._moduleCount - 15 + i][8] = mod;
            }
        }
        for (let i = 0; i < 15; i++) {
            let mod = (!test && ((bits >> i) & 1) == 1);
            if (i < 8) {
                this._modules[8][this._moduleCount - i - 1] = mod;
            } else if (i < 9) {
                this._modules[8][15 - i - 1 + 1] = mod;
            } else {
                this._modules[8][15 - i - 1] = mod;
            }
        }
        this._modules[this._moduleCount - 8][8] = (!test);
    }

    mapData(data, maskPattern) {
        let inc = -1;
        let row = this._moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = this._moduleCount - 1; col > 0; col -= 2) {
            if (col == 6) col--; while (true) {
                for (let c = 0; c < 2; c++) {
                    if (this._modules[row][col - c] == null) {
                        let dark = false;
                        if (byteIndex < data.length) {
                            dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                        }
                        let mask = QRUtil.getMask(maskPattern, row, col - c);
                        if (mask) {
                            dark = !dark;
                        }
                        this._modules[row][col - c] = dark; bitIndex--;
                        if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
                    }
                }
                row += inc;
                if (row < 0 || this._moduleCount <= row) {
                    row -= inc; inc = -inc; break;
                }
            }
        }
    }



    createData(typeNumber, errorCorrectLevel, dataList) {
        let rsBlocks = getRSBlocks(typeNumber, errorCorrectLevel);
        let buffer = new QRBitBuffer();
        for (let i = 0; i < dataList.length; i++) {
            let data = dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
            data.write(buffer);
        }
        let totalDataCount = 0; for (var i = 0; i < rsBlocks.length; i++) { totalDataCount += rsBlocks[i].dataCount; }
        if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw new Error(["code length overflow. (",
                buffer.getLengthInBits(),
                ">",
                totalDataCount * 8,
                ")"].join(""));
        }
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) { buffer.put(0, 4); }
        while (buffer.getLengthInBits() % 8 != 0) { buffer.putBit(false); }
        while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) { break; }
            buffer.put(PAD0, 8); if (buffer.getLengthInBits() >= totalDataCount * 8) { break; }
            buffer.put(PAD1, 8);
        }
        return this.createBytes(buffer, rsBlocks);
    }

    createBytes(buffer, rsBlocks) {
        let offset = 0;
        let maxDcCount = 0;
        let maxEcCount = 0;
        let dcdata = new Array(rsBlocks.length);
        let ecdata = new Array(rsBlocks.length);
        for (let r = 0; r < rsBlocks.length; r++) {
            let dcCount = rsBlocks[r].dataCount;
            let ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);
            for (var i = 0; i < dcdata[r].length; i++) {
                dcdata[r][i] = 0xff & buffer.buffer[i + offset];
            }
            offset += dcCount;
            let rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            let rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
            let modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (let i = 0; i < ecdata[r].length; i++) {
                let modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
            }
        }
        let totalCodeCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
            totalCodeCount += rsBlocks[i].totalCount;
        }
        let data = new Array(totalCodeCount);
        let index = 0;
        for (let i = 0; i < maxDcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < dcdata[r].length) { data[index++] = dcdata[r][i]; }
            }
        }
        for (let i = 0; i < maxEcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < ecdata[r].length) { data[index++] = ecdata[r][i]; }
            }
        }
        return data;
    }


}



export default QRModelClass;