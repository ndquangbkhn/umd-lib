import './notice-popup.css';
import _TEMPLATE_ from './notice-popup.html?raw';
import {DOMUtil, DOMClass} from '@aq-umd/core';

class NoticePopup extends DOMClass {

  constructor(container, options = {}) {
    super(container, options);
    this.data = this.options.data;

  }

  override = {
    template: _TEMPLATE_,
    resource:{},
    created() {
      
    },
    binding() {
      
    },
    mounted: () => {
      
    },
    unmounted() {
      
    },
    click: {
      "[action='close']": (e, el) => {
        DOMUtil.stopEvent(e);
        this.hide();
      }
      
    },
    scroll: {

    }
  };

  warn(message){
    this.show();
    DOMUtil.attr(this.element, "type", "warning");
    DOMUtil.html(this.els.messageEl, message);
  }
  error(message){
    this.show();
    DOMUtil.attr(this.element, "type", "error");
  }
  info(message){
    this.show();
    DOMUtil.attr(this.element, "type", "info");
  }

  
  showHandler() {
    DOMUtil.show(this.element, "flex");
}

}

export default NoticePopup;

