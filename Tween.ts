
module game {
    /**
     * 动画缓动类
     */
    export class Tween extends egret.EventDispatcher {

        private static _tweens: Array<Tween> = [];
        private static _lastTime: number = NaN;
        private static _lastDelta: number = Infinity;
        private static _paused: boolean = false;
        private static _ticking: boolean = false;

        /**
         * 激活一个对象，对其添加 Tween 动画
         * @param target {Object} 要激活 Tween 的对象
         * @param props props {any} 参数，支持loop(循环播放) onChange(变化回调)
         * @param override {boolean} 是否移除对象之前添加的tween，默认值false。
         */
        public static get(target: Object, props?: { loop?: boolean, paused?: boolean, onChange?: Handler }, override?: boolean) {
            const self = this;
            if (override) {
                self.remove(target);
            }
            return new self(target, props);
        }

        /**
         * 删除一个对象上的全部 Tween 动画
         * @param target  需要移除 Tween 的对象
         */
        public static remove(target: Object) {
            const _tweens = this._tweens;
            for (let i = _tweens.length; --i >= 0;) {
                if (_tweens[i]._target === target) {
                    _tweens[i]._paused = true;
                    _tweens.splice(i, 1);
                }
            }
        }

        /**
         * 暂停某个对象的所有 Tween
         * @param target 要暂停 Tween 的对象
         */
        public static pause(target: Object, value: boolean) {
            const _tweens = this._tweens;
            for (let i = _tweens.length; --i >= 0;) {
                if (_tweens[i]._target === target) {
                    _tweens[i]._paused = value;
                }
            }
        }

        /**
         * 暂停所有对象的所有 Tween
         */
        public static pauseAll() {
            const self = this;

            self._paused = true;
            self._lastTime = NaN;
            egret.stopTick(self._tick, self);
        }

        /**
         * 继续播放所有对象的所有 Tween
         */
        public static resumeAll() {
            const self = this;

            self._paused = false;
            egret.startTick(self._tick, self);
        }

        /**
         * 移除所有对象的 Tween
         */
        public static removeAll() {
            const self = this;
            const _tweens = self._tweens;

            for (let i = _tweens.length; --i >= 0;) {
                _tweens[i]._paused = false;
            }
            _tweens.length = 0;
            egret.stopTick(self._tick, self);
        }

        private static _tick(timeStamp: number) {
            const self = this;
            const tweens = self._tweens.concat();
            const nextTicks: Array<Tween> = [];
            const cDelta = timeStamp - self._lastTime;
            const delta = Math.min(cDelta, self._lastDelta);

            let i: number;
            let size: number;
            let tween: Tween;

            self._lastTime = timeStamp;
            self._lastDelta = cDelta;
            self._ticking = true;
            while (tweens.length !== size) {
                for (i = size = tweens.length; --i >= 0;) {
                    tween = tweens[i];

                    if (self._paused)
                        break;
                    else if (tween._paused)
                        continue;

                    if (tween._nextTick)
                        nextTicks.push(tween);
                    else
                        tween._tick(delta);

                    tweens.splice(i, 1);
                }
                if (self._paused)
                    break;
            }
            for (i = nextTicks.length; --i >= 0;)
                nextTicks[i]._nextTick = false;
            self._ticking = false;

            return true;
        }

        private static _register(tween: Tween, value: boolean) {
            const self = this;
            const tweens = self._tweens;

            if (value) {
                if (tweens.unshift(tween) === 1 && !self._paused) {
                    self._lastTime = egret.getTimer();
                    egret.startTick(self._tick, self);
                }
            }
            else {
                const index = tweens.indexOf(tween);
                if (index > -1) {
                    tweens[index]._paused = true;
                    tweens.splice(index, 1);
                }
                if (tweens.length === 0) {
                    egret.stopTick(self._tick, self);
                }
            }
        }

        /** 缓动对象 */
        private _target: Object;
        /** 是否循环 */
        private _loop: boolean;
        /** 是否暂停 */
        private _paused: boolean;
        /** 缓动序列 */
        private _actions: Array<Array<any>>;
        /** 缓动序列指针 */
        private _index: number;
        /** 当前缓动序列项已执行时间 */
        private _duration: number;
        /** 是否存在缓动时间 */
        private _hasDuration: boolean;
        /** 解除暂停状态后，是否下一帧再执行 */
        private _nextTick: boolean;
        /** 原始属性记录 */
        private _oProps: Object;
        /** 更新属性记录 */
        private _fProps: Object;

        public constructor(target: Object, props?: { loop?: boolean, paused?: boolean, change?: Handler }) {
            super();
            this.initialize(target, props);
        }

        private initialize(target: Object, props?: { loop?: boolean, paused?: boolean, change?: Handler }) {
            const self = this;

            self._target = target;
            self._actions = [];
            self._index = 0;
            self._duration = 0;
            self._hasDuration = false;
            self._nextTick = false;
            self._oProps = {};
            self._fProps = {};
            if (props) {
                self._loop = props.loop;
                self._paused = props.paused;
                if (props.change) {
                    self.addEventListener(egret.Event.CHANGE, props.change.run, props.change);
                }
            }
            Tween._register(self, true);
        }

        /**
         * 设置是否暂停
         * @param value {boolean} 是否暂停
         * @param nextTick {boolean} 解除暂停状态后，是否下一帧再执行，默认为true
         */
        public setPaused(value: boolean, nextTick?: boolean): Tween {
            const self = this;

            self._paused = value;
            self._nextTick = !value && nextTick !== false && Tween._ticking;

            return self;
        }

        /**
         * 立即将指定对象的属性修改为指定值
         * @param props {Object} 对象的属性集合
         * @param target 要继续播放 Tween 的对象
         */
        public set(props: Object, target?: Object) {
            const self = this;

            if (target === void 0 || target === self._target) {
                self._markProps(props);
            }
            self._actions.push(['set', props, target]);
            return self;
        }

        /**
         * 将指定对象的属性修改为指定值
         * @param props {Object} 对象的属性集合
         * @param duration {number} 持续时间
         * @param ease {egret.Ease} 缓动算法
         */
        public to(props: Object, duration?: number, ease?: Function) {
            const self = this;

            if (duration > 0) {
                self._hasDuration = true;
                self._actions.push(['to', props, duration, ease]);
                return self;
            }
            else {
                return self.set(props);
            }
        }

        /**
         * 等待指定毫秒后执行下一个动画
         * @param duration {number} 要等待的时间，以毫秒为单位
         */
        public wait(duration: number) {
            const self = this;

            if (duration > 0) {
                self._hasDuration = true;
                self._actions.push(['wait', duration]);
            }

            return self;
        }

        /**
         * 执行回调函数
         * @param callback {Function} 回调方法
         * @param thisObj {any} 回调方法this作用域
         * @param params {any[]} 回调方法参数
         */
        public call(method: Function, caller?: any, args?: Array<any>) {
            this._actions.push(['call', Handler.create(caller, method, args, false)]);
            return this;
        }

        /**
         * 执行
         * @param tween {Tween} 需要操作的 Tween 对象，默认this
         * @param nextTick {boolean} 解除暂停状态后，是否下一帧再执行，默认为true
         */
        public play(tween?: Tween, nextTick?: boolean) {
            if (!tween) {
                tween = this;
            }
            return this.call(tween.setPaused, tween, [false, nextTick]);
        }

        /**
         * 暂停
         * @param tween {Tween} 需要操作的 Tween 对象，默认this
         */
        public pause(tween?: Tween) {
            if (!tween) {
                tween = this;
            }
            return this.call(tween.setPaused, tween, [true]);
        }

        /** 
         * 终止
         * @param tween {Tween} 需要操作的 Tween 对象，默认this
         */
        public clear() {
            Tween._register(this, false);
        }

        private _tick(delta: number) {
            const self = this;

            if (self._paused || Tween._paused)
                return;

            const _actions = self._actions;
            const _action = _actions[self._index];
            const _isNew = self._duration === 0;
            const _cDuration = self._duration += delta;

            if (_action === void 0) {
                Tween._register(self, false);
                return;
            }

            let _duration: number = 0;

            switch (_action[0]) {
                case 'set':
                    self._updateProps(_action[1], 1, void 0, _action[2]);
                    break;
                case 'to':
                    _duration = _action[2];

                    if (_isNew) {
                        self._markProps(_action[1]);
                    }
                    self._updateProps(_action[1], Math.min(_cDuration / _duration, 1), _action[3]);
                    break;
                case 'wait':
                    _duration = _action[1];
                    break;
                case 'call':
                    _action[1].run();
                    break;
            }

            if (_cDuration < _duration || self._paused || Tween._paused)
                return;

            if (++self._index >= _actions.length) {
                if (self._loop) {
                    self._index = 0;
                    self._duration = 0;
                    self._updateProps(self._oProps, 1);
                    if (self._hasDuration)
                        self._tick(_cDuration - _duration);
                }
                else {
                    Tween._register(self, false);
                }
            }
            else {
                self._duration = 0;
                self._tick(_cDuration - _duration);
            }
        }

        /**
         * 标记需要记录的属性值
         * @param props 属性对象
         */
        private _markProps(props: Object) {
            const { _oProps, _fProps, _target } = this;

            let key: string;
            let value: any;

            for (key of Object.keys(props)) {
                value = _target[key];

                if (!_oProps.hasOwnProperty(key)) {
                    _oProps[key] = value;
                }
                _fProps[key] = value;
            }
        }

        /**
         * 更新属性对象到缓动对象
         * @param props 属性对象
         * @param ratio 更新比例
         * @param ease 缓动算法
         * @param target 缓动对象
         */
        private _updateProps(props: Object, ratio: number, ease?: Function, target?: Object) {
            const self = this;
            const nTarget = target || self._target;
            const nRatio = ease ? ease(ratio, 0, 1, 1) : ratio;
            const _fProps = self._fProps;

            let key: string;

            for (key of Object.keys(props)) {
                if (isFinite(props[key]) && props[key] !== null) {
                    nTarget[key] = _fProps[key] + (props[key] - _fProps[key]) * nRatio;
                }
                else {
                    nTarget[key] = _fProps[key];
                }
            }

            if (ratio >= 1) {
                self.dispatchEventWith(egret.Event.CHANGE);
            }
        }

    }
}