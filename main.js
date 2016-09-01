/**
 * echarts �ٶȵ�ͼ��չ��������echarts��ʼ��ǰʹ��
 *
 * @desc echarts����Canvas����Javascriptͼ��⣬�ṩֱ�ۣ��������ɽ������ɸ��Ի����Ƶ�����ͳ��ͼ��
 * @author Neil (����, 511415343@qq.com)
 */
define(function (require) {

    /**
     * ���캯��
     *
     * @param {String|HTMLElement|BMap.Map} obj
     * @param {BMap} BMap
     * @param {echarts} ec
     * @parma {Object=} mapOption �ٶȵ�ͼ��ʼ��ѡ��
     * @constructor
     */
    function BMapExt(obj, BMap, ec, mapOption) {
        this._init(obj, BMap, ec, mapOption);
    };

    /**
     * echarts ����Ԫ��
     *
     * @type {HTMLElement}
     * @private
     */
    BMapExt.prototype._echartsContainer = null;

    /**
     * �ٶȵ�ͼʵ��
     *
     * @type {BMap.Map}
     * @private
     */
    BMapExt.prototype._map = null;

    /**
     * ʹ�õ�echartsʵ��
     *
     * @type {ECharts}
     * @private
     */
    BMapExt.prototype._ec = null;

    /**
     * geoCoord
     *
     * @type {Object}
     * @private
     */
    BMapExt.prototype._geoCoord = [];

    /**
     * ��¼��ͼ�ı�����
     *
     * @type {Array.<number>}
     * @private
     */
    BMapExt.prototype._mapOffset = [0, 0];


    /**
     * ��ʼ������
     *
     * @param {String|HTMLElement|BMap.Map} obj
     * @param {BMap} BMap
     * @param {echarts} ec
     * @private
     */
    BMapExt.prototype._init = function (obj, BMap, ec, mapOption) {
        var self = this;
        self._map = obj.constructor == BMap.Map ? obj : new BMap.Map(obj, mapOption);

        /**
         * Overlay��,�������ɸ�����
         *
         * @constructor
         * @extends BMap.Overlay
         */
        function Overlay() {}

        Overlay.prototype = new BMap.Overlay();

        /**
         * ��ʼ��
         *
         * @param {BMap.Map} map
         * @override
         */
        Overlay.prototype.initialize = function (map) {
            var size = map.getSize();
            var div = self._echartsContainer = document.createElement('div');
            div.style.position = 'absolute';
            div.style.height = size.height + 'px';
            div.style.width = size.width + 'px';
            div.style.top = 0;
            div.style.left = 0;
            map.getPanes().labelPane.appendChild(div);
            return div;
        };

        /**
         * @override
         */
        Overlay.prototype.draw = function () {};

        var myOverlay = new Overlay();

        /**
         * ��ȡecharts����
         *
         * @return {HTMLElement}
         * @public
         */
        self.getEchartsContainer = function () {
            return self._echartsContainer;
        };

        /**
         * ��ȡmapʵ��
         *
         * @return {BMap.Map}
         * @public
         */
        self.getMap = function () {
            return self._map;
        }

        /**
         * �Զ�����ק�¼�
         */
        self.onmoving = null;
        self.onmoveend = null;

        /**
         * �Զ��������¼�
         */
        self.onzoom = null;

        /**
         * ��γ��ת��Ϊ��Ļ����
         *
         * @param {Array.<number>} geoCoord  ��γ��
         * @return {Array.<number>}
         * @public
         */
        self.geoCoord2Pixel = function (geoCoord) {
            var point = new BMap.Point(geoCoord[0], geoCoord[1]);
            var pos = self._map.pointToOverlayPixel(point);
            return [pos.x, pos.y];
        };

        /**
         * ��Ļ����ת��Ϊ��γ��
         *
         * @param {Array.<number>} pixel  ��������
         * @return {Array.<number>}
         * @public
         */
        self.pixel2GeoCoord = function (pixel) {
            var point = self._map.overlayPixelToPoint({
                x: pixel[0],
                y: pixel[1]
            });
            return [point.lng, point.lat];
        };

        /**
         * ��ʼ��echartsʵ��
         *
         * @return {ECharts}
         * @public
         */
        self.initECharts = function () {
            self._ec = ec.init.apply(self, arguments);
            self._bindEvent();
            self._addMarkWrap();
            return self._ec;
        };

        // addMark wrap for get position from baidu map by geo location
        // by kener at 2015.01.08
        self._addMarkWrap = function () {
            function _addMark (seriesIdx, markData, markType) {
                var data;
                if (markType == 'markPoint') {
                    var data = markData.data;
                    if (data && data.length) {
                        for (var k = 0, len = data.length; k < len; k++) {
                            self._AddPos(data[k]);
                        }
                    }
                }
                else {
                    data = markData.data;
                    if (data && data.length) {
                        for (var k = 0, len = data.length; k < len; k++) {
                            self._AddPos(data[k][0]);
                            self._AddPos(data[k][1]);
                        }
                    }
                }
                self._ec._addMarkOri(seriesIdx, markData, markType);
            }
            self._ec._addMarkOri = self._ec._addMark;
            self._ec._addMark = _addMark;
        };

        /**
         * ��ȡEChartsʵ��
         *
         * @return {ECharts}
         * @public
         */
        self.getECharts = function () {
            return self._ec;
        };

        /**
         * ��ȡ��ͼ��ƫ����
         *
         * @return {Array.<number>}
         * @public
         */
        self.getMapOffset = function () {
            return self._mapOffset;
        };

        /**
         * ��echarts��setOption��һ�δ���
         * ����ΪmarkPoint��markLine�����x��y���꣬��Ҫname��geoCoord��Ӧ
         *
         * @param {Object}
         * @public
         */
        self.setOption = function (option, notMerge) {
            var series = option.series || {};

            // ��¼���е�geoCoord
            for (var i = 0, item; item = series[i++];) {
                var geoCoord = item.geoCoord;
                if (geoCoord) {
                    for (var k in geoCoord) {
                        self._geoCoord[k] = geoCoord[k];
                    }
                }
            }

            // ���x��y
            for (var i = 0, item; item = series[i++];) {
                var markPoint = item.markPoint || {};
                var markLine = item.markLine || {};

                var data = markPoint.data;
                if (data && data.length) {
                    for (var k = 0, len = data.length; k < len; k++) {
                        self._AddPos(data[k]);
                    }
                }

                data = markLine.data;
                if (data && data.length) {
                    for (var k = 0, len = data.length; k < len; k++) {
                        self._AddPos(data[k][0]);
                        self._AddPos(data[k][1]);
                    }
                }
            }

            self._ec.setOption(option, notMerge);
        }

        /**
         * ����x��y����
         *
         * @param {Object} obj  markPoint��markLine data�е��������name
         * @param {Object} geoCoord
         */
        self._AddPos = function (obj) {
            var coord = this._geoCoord[obj.name]
            var pos = this.geoCoord2Pixel(coord);
            obj.x = pos[0] - self._mapOffset[0];
            obj.y = pos[1] - self._mapOffset[1];
        };

        /**
         * �󶨵�ͼ�¼��Ĵ�����
         *
         * @private
         */
        self._bindEvent = function () {
            self._map.addEventListener('zoomend', _zoomChangeHandler);

            self._map.addEventListener('moving', _moveHandler('moving'));
            self._map.addEventListener('moveend', _moveHandler('moveend'));

            self._ec.getZrender().on('dragstart', _dragZrenderHandler(true));
            self._ec.getZrender().on('dragend', _dragZrenderHandler(false));
        }

        /**
         * ��ͼ���Ŵ����¼�
         *
         * @private
         */
        function _zoomChangeHandler() {
            _fireEvent('zoom');
        }

        /**
         * ��ͼ�ƶ�������ק�����¼�
         *
         * @param {string} type moving | moveend  �ƶ���|�ƶ�����
         * @return {Function}
         * @private
         */
        function _moveHandler(type) {
            return function () {
                // ��¼������
                var offsetEle =
                    self._echartsContainer.parentNode.parentNode.parentNode;
                self._mapOffset = [
                    - parseInt(offsetEle.style.left) || 0,
                    - parseInt(offsetEle.style.top) || 0
                ];
                self._echartsContainer.style.left = self._mapOffset[0] + 'px';
                self._echartsContainer.style.top = self._mapOffset[1] + 'px';

                _fireEvent(type);
            }
        }

        /**
         * Zrender��ק�����¼�
         *
         * @param {boolean} isStart
         * @return {Function}
         * @private
         */
        function _dragZrenderHandler(isStart) {
            return function () {
                var func = isStart ? 'disableDragging' : 'enableDragging';
                self._map[func]();
            }
        }

        /**
         * �����¼�
         *
         * @param {stirng}  type �¼�����
         * @private
         */
        function _fireEvent(type) {
            var func = self['on' + type];
            if (func) {
                func();
            } else {
                self.refresh();
            }
        }

        /**
         * ˢ��ҳ��
         *
         * @public
         */
        self.refresh = function () {
            if (self._ec) {
                var option = self._ec.getOption();
                var component = self._ec.component || {};
                var legend = component.legend;
                var dataRange = component.dataRange;

                if (legend) {
                    option.legend.selected = legend.getSelectedMap();
                }

                if (dataRange) {
                    option.dataRange.range = dataRange._range;
                }
                self._ec.clear();
                self.setOption(option);
            }
        };

        self._map.addOverlay(myOverlay);
    };

    return BMapExt;
});