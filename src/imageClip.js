class Emitter extends EventTarget {
  constructor() {
    super();
    this.on = this.addEventListener;
    this.off = this.removeEventListener;
  }

  emit(eventName) {
    const e = new Event(eventName, {bubbles: false, cancelable: true})
    this.dispatchEvent(e)
  }
}

const style = `<style type="text/css" id="clip-css">
      .clip-area-selector {
          visibility: hidden;
          position: absolute;
          z-index: 1;
          border: 1px solid #1890FF;
          box-sizing: border-box;
          background-origin: border-box;
          background-repeat: no-repeat;
          cursor: move;
      }
      .resize-widget {
          position: absolute;
          border-style: solid;
          border-color: #1890FF;
          width: 50%;
          height: 50%;
          max-width: 32px;
          max-height: 32px;
      }
      .resize-widget.lt {
          left: 0;
          top: 0;
          border-width: 2px 0 0 2px;
          cursor: nw-resize;
      }
      .resize-widget.lb {
          left: 0;
          bottom: 0;
          border-width: 0 0 2px 2px;
          cursor: sw-resize;
      }
      .resize-widget.rt {
          right: 0;
          top: 0;
          border-width: 2px 2px 0 0;
          cursor: ne-resize;
      }
      .resize-widget.rb {
          right: 0;
          bottom: 0;
          border-width: 0 2px 2px 0;
          cursor: se-resize;
      }
      .confirm-btns {
          display: none;
          position: absolute;
          right: 0;
          bottom: -40px;
          padding: 6px 4px;
          box-sizing: border-box;
          border-radius: 4px;
          width: 64px;
          height: 32px;
          background-color: #303136;
          font-size: 0;
      }
      .confirm-btns button {
          margin: 0 4px;
          border: 0;
          border-radius: 2px;
          outline: 0;
          padding: 0;
          width: 20px;
          height: 20px;
          text-align: center;
          background-color: transparent;
          cursor: pointer;
      }
</style>`

const areaSelectorTpl = `
      <div class="clip-area-selector">
        <i class="resize-widget lt" data-direction="lt"></i>
        <i class="resize-widget lb" data-direction="lb"></i>
        <i class="resize-widget rt" data-direction="rt"></i>
        <i class="resize-widget rb" data-direction="rb"></i>
        <div class="confirm-btns">
          <button class="clip-drop-btn" type="button">
              <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><path id="a" d="M0 0h20v20H0z"/></defs><g fill="none" fill-rule="evenodd"><mask id="b" fill="#fff"><use xlink:href="#a"/></mask><path d="M10.007 2.494c.345 0 .625.28.625.625l-.001 6.249h6.25a.625.625 0 1 1 0 1.25h-6.25v6.25a.625.625 0 1 1-1.25 0v-6.25H3.13a.625.625 0 1 1 0-1.25h6.25v-6.25c0-.344.28-.624.626-.624z" fill="#EB5B57" mask="url(#b)" transform="rotate(45 10.007 9.994)"/></g></svg>
          </button>
          <button class="clip-ok-btn" type="button" style="border: 0;outline: 0;width: 20px;height: 20px;background-color: transparent;cursor: pointer;">
              <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M0 0h20v20H0z"/><path stroke="#41C658" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" d="M3.494 10l4.969 5.327L16.386 3.97"/></g></svg>
          </button>
        </div>
      </div>
`

class ClipImage extends Emitter {
  constructor(imgEle, option) {
    super();
    this.image = imgEle;
    this.wrapperEle = null;
    this.clipAreaEle = null;
    this.confirmBtn = null;
    this.cancenBtn = null;
    this.originDraggable = this.image.draggable;
    this.closed = true;
    const defaultOption = {
      showConfirmBtns: true
    }
    this.option = Object.assign(defaultOption, option);
    this.wrapperEleOffset = {
      left: undefined,
      top: undefined,
    }
    this.clipArea = {
      x1: undefined,
      y1: undefined,
      x2: undefined,
      y2: undefined,
    };
    this.mousePosition = {
      x1: undefined,
      y1: undefined,
      x2: undefined,
      y2: undefined,
    }
    if (!document.getElementById('clip-css')) {
      document.head.insertAdjacentHTML('beforeend', style);
    }
    this._init();
  }

  _init() {
    this._initWrapper();
    this._initClipWidget();
    this._bindEvent();
    this.openClip();
  }

  _initWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'img-clip-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.lineHeight = '0';
    wrapper.style.backgroundColor = '#000';
    wrapper.style.userSelect = 'none';
    this.image.insertAdjacentElement('beforebegin', wrapper);
    wrapper.appendChild(this.image);
    this.wrapperEle = wrapper;
    this.wrapperEleOffset = this._getOffset(wrapper);
  }

  _initClipWidget() {
    this.wrapperEle.insertAdjacentHTML('beforeend', areaSelectorTpl);
    const clipAreaEle = this.wrapperEle.querySelector('.clip-area-selector');
    this.clipAreaEle = clipAreaEle;
    this.confirmBtns = clipAreaEle.querySelector('.confirm-btns');
    clipAreaEle.style.backgroundImage = `url(${this.image.src})`;
    clipAreaEle.style.backgroundPosition = `-${this.clipArea.left} -${this.clipArea.top}`;
  }

  _bindEvent() {
    const wrapperEle = this.wrapperEle;

    wrapperEle.addEventListener('mousedown', e => {
      if (this.closed) {
        return
      }
      this.confirmBtns.style.display = 'none';
      this.clipAreaEle.style.backgroundSize = `${this.image.width}px ${this.image.height}px`;
      this.mousePosition.x1 = e.pageX;
      this.mousePosition.y1 = e.pageY;

      if (e.target === this.image) {
        window.addEventListener('mousemove', this._userRedrawClipAreaHandler);
        return
      }

      if (e.target === this.clipAreaEle) {
        window.addEventListener('mousemove', this._userDragClipAreaHandler);
        return
      }

      if (e.target.className.indexOf('.resize-widget')) {
        window.addEventListener('mousemove', this._userResizeClipAreaHandler);
      }
    })

    window.addEventListener('mouseup', this._mouseUpHandler);

    window.addEventListener('keydown', this._escHandler);

    if (this.option.showConfirmBtns) {
      this.confirmBtn = this.clipAreaEle.querySelector('.clip-ok-btn');
      this.cancelBtn = this.clipAreaEle.querySelector('.clip-drop-btn');

      this.confirmBtn.addEventListener('mousedown', e => {
        e.stopPropagation();
        this.emit('confirm');
      });

      this.cancelBtn.addEventListener('mousedown', e => {
        e.stopPropagation();
        this.closeClip();
      });
    }
  }

  _userRedrawClipAreaHandler = e => {
    this.clipAreaEle.style.visibility = 'visible';
    const clipArea = this.clipArea;
    const offsetLeft = this.wrapperEleOffset.left;
    const offsetTop = this.wrapperEleOffset.top;

    clipArea.x1 = this.mousePosition.x1 - offsetLeft;
    clipArea.y1 = this.mousePosition.y1 - offsetTop;
    clipArea.x2 = e.pageX - offsetLeft;
    clipArea.y2 = e.pageY - offsetTop;
    this._renderClipArea();
  }

  _userDragClipAreaHandler = e => {
    const clipArea = this.clipArea;

    let dx = e.pageX - this.mousePosition.x1;
    let dy = e.pageY - this.mousePosition.y1;

    let minX = Math.min(clipArea.x1, clipArea.x2);
    let maxX = Math.max(clipArea.x1, clipArea.x2);
    let minY = Math.min(clipArea.y1, clipArea.y2);
    let maxY = Math.max(clipArea.y1, clipArea.y2);

    dx = this._getSafeNumber(dx, -minX, this.image.width - maxX);
    dy = this._getSafeNumber(dy, -minY, this.image.height - maxY);

    clipArea.x1 += dx;
    clipArea.y1 += dy;
    clipArea.x2 += dx;
    clipArea.y2 += dy;

    this.mousePosition.x1 = e.pageX;
    this.mousePosition.y1 = e.pageY;
    this._renderClipArea();
  }

  _userResizeClipAreaHandler = e => {
    const clipArea = this.clipArea;
    const minX = Math.min(clipArea.x1, clipArea.x2);
    const maxX = Math.max(clipArea.x1, clipArea.x2);
    const minY = Math.min(clipArea.y1, clipArea.y2);
    const maxY = Math.max(clipArea.y1, clipArea.y2);

    if (e.target.className.indexOf('lt') > -1) {
      clipArea.x1 = maxX;
      clipArea.y1 = maxY;
      clipArea.x2 = minX;
      clipArea.y2 = minY;
    }

    if (e.target.className.indexOf('rt') > -1) {
      clipArea.x1 = minX;
      clipArea.y1 = maxY;
      clipArea.x2 = maxX;
      clipArea.y2 = minY;
    }

    if (e.target.className.indexOf('rb') > -1) {
      clipArea.x1 = minX;
      clipArea.y1 = minY;
      clipArea.x2 = maxX;
      clipArea.y2 = maxY;
    }

    if (e.target.className.indexOf('lb') > -1) {
      clipArea.x1 = maxX;
      clipArea.y1 = minY;
      clipArea.x2 = minX;
      clipArea.y2 = maxY;
    }

    const dx = e.pageX - this.mousePosition.x1;
    const dy = e.pageY - this.mousePosition.y1;
    clipArea.x2 += dx;
    clipArea.y2 += dy;

    this.mousePosition.x1 = e.pageX;
    this.mousePosition.y1 = e.pageY;
    this._renderClipArea();
  }

  _mouseUpHandler = e => {
    window.removeEventListener('mousemove', this._userRedrawClipAreaHandler);
    window.removeEventListener('mousemove', this._userDragClipAreaHandler);
    window.removeEventListener('mousemove', this._userResizeClipAreaHandler);

    if (!this.closed && this.option.showConfirmBtns) {
      this.confirmBtns.style.display = 'block';
    }
  }

  _escHandler = e => {
    if (e.key === 'Escape') {
      this.closeClip();
    }
  }

  _renderClipArea() {
    const clipArea = this.clipArea;
    const clipAreaEle = this.clipAreaEle;

    clipArea.x1 = this._getSafeNumber(clipArea.x1, 0, this.image.width);
    clipArea.y1 = this._getSafeNumber(clipArea.y1, 0, this.image.height);
    clipArea.x2 = this._getSafeNumber(clipArea.x2, 0, this.image.width);
    clipArea.y2 = this._getSafeNumber(clipArea.y2, 0, this.image.height);

    const left = Math.min(clipArea.x1, clipArea.x2);
    const top = Math.min(clipArea.y1, clipArea.y2);
    const width = Math.abs(clipArea.x1 - clipArea.x2);
    const height = Math.abs(clipArea.y1 - clipArea.y2);

    clipAreaEle.style.left = left + 'px';
    clipAreaEle.style.top = top + 'px';
    clipAreaEle.style.width = width + 'px';
    clipAreaEle.style.height = height + 'px';

    clipAreaEle.style.backgroundImage = `url(${this.image.src})`;
    clipAreaEle.style.backgroundSize = `${this.image.width}px ${this.image.height}px`;
    clipAreaEle.style.backgroundPositionX = `-${left}px`;
    clipAreaEle.style.backgroundPositionY = `-${top}px`;
  }

  _getSafeNumber(num, minLimit, maxLimit) {
    if (num < minLimit) {
      return minLimit;
    }
    if (num > maxLimit) {
      return maxLimit;
    }
    return num
  }

  _getOffset(ele) {
    let left = 0, top = 0;

    if (getComputedStyle(ele, null).position === 'fixed') {
      left = ele.offsetLeft;
      top = ele.offsetTop + (document.body.scrollTop + document.documentElement.scrollTop);
    } else {
      while (ele.offsetParent !== null) {
        left += ele.offsetLeft;
        top += ele.offsetTop;
        ele = ele.offsetParent;
      }
    }
    return {
      left: left,
      top: top
    };
  }

  openClip() {
    this.closed = false;
    this.clipAreaEle.style.visibility = 'hidden';
    this.image.style.opacity = '0.45';
    this.image.style.cursor = 'crosshair';
    this.image.draggable = false;
  }

  closeClip() {
    this.closed = true;
    this.clipArea = {};
    this.clipAreaEle.style.visibility = 'hidden';
    this.image.style.opacity = '';
    this.image.style.cursor = '';
    this.image.draggable = this.originDraggable;
    this.emit('closeClip');
  }

  getClippedArea() {
    const area = this.clipArea;
    const w = this.image.width;
    const h = this.image.height;
    return {
      x1: Math.min(area.x1,area.x2) / w,
      y1: Math.min(area.y1,area.y2) / h,
      x2: Math.max(area.x1,area.x2) / w,
      y2: Math.max(area.y1,area.y2) / h,
    };
  }

  setClippedArea({x1,y1,x2,y2}, forceShouUI = false) {
    const area = this.clipArea;
    const w = this.image.width;
    const h = this.image.height;
    area.x1 = x1 * w;
    area.x2 = x2 * w;
    area.y1 = y1 * h;
    area.y2 = y2 * h;
    this._renderClipArea();

    if (!this.closed && forceShouUI) {
      this.image.style.opacity = '0.45';
      this.clipAreaEle.style.visibility = 'visible';
    }
  }

  destroy() {
    if (!this.closed) {
      this.closeClip();
    }
    const wrapper = this.wrapperEle;
    try {
      wrapper.parentElement.replaceChild(this.image, wrapper);
    } catch (e) {}
    this.image.style.opacity = '';
    this.image.style.cursor = '';
    window.removeEventListener('mouseup', this._mouseUpHandler);
    window.removeEventListener('keydown', this._escHandler);
    this.emit('destroy');
  }

  clip() {
    const image = this.image;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let {x1, y1, x2, y2} = this.getClippedArea();
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    canvas.width = image.naturalWidth * dx;
    canvas.height = image.naturalHeight * dy;


    const visualWidth = image.width * dx;
    ctx.drawImage(image, image.naturalWidth * x1, image.naturalHeight * y1, image.naturalWidth * dx, image.naturalHeight * dy, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        resolve({blob, visualWidth});
      }, 'image/jpeg', 0.92);
    });
  }
}

export default ClipImage;
