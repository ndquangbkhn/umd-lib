
import QRMath from './Math';

class QRPolynomial {

    constructor(num, shift) {
        if (num.length == undefined) {
            throw new Error(this.length + "/" + shift);
        }
        var offset = 0;
        while (offset < num.length && num[offset] == 0) {
            offset++;
        }
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) {
            this.num[i] = num[i + offset];
        }
    }

    get(index) {
        return this.num[index];
    }

    getLength() {
        return this.num.length;
    }

    multiply(e) {
        let num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i++) {
            for (let j = 0; j < e.getLength(); j++) {
                num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
            }
        }
        return new QRPolynomial(num, 0);
    }

    mod(e) {
        if (this.getLength() - e.getLength() < 0) {
            return this;
        }
        let ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        let num = new Array(this.getLength());
        for (var i = 0; i < this.getLength(); i++) {
            num[i] = this.get(i);
        }
        for (let i = 0; i < e.getLength(); i++) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
    };

}



export default QRPolynomial;