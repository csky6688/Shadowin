﻿(function (window, document, undefined) {
    var _shadowStock = {},
        _appId = 'ShadowStock_SH_SZ',
        _appName = 'ShadowStock 影子证券 - 沪深创业板',
        _appVersion = '2.0',

        /******************** 配置 ********************/
        _appSettings = {
            cookieExpires: new Date(9999, 1, 1),
            /*
            {"11":"A 股","12":"B 股","13":"权证","14":"期货","15":"债券",
            "21":"开基","22":"ETF","23":"LOF","24":"货基","25":"QDII","26":"封基",
            "31":"港股","32":"窝轮","41":"美股","42":"外期"}
            */
            suggestionUrl: 'http://suggest3.sinajs.cn/suggest/?type=11,12,13,14,15&key={1}&name={0}', //http://suggest3.sinajs.cn/suggest/?type=11,12,13,14,15&key=xtd&name=suggestdata_1438174826752
            stockUrl: 'http://hq.sinajs.cn/?rn={0}&list={1}', //http://hq.sinajs.cn/?rn=1438174827282&list=sh600036,sh600050,sh601857,sz000002
            stockColumns: '名称,今开,昨收,最新价,最高,最低,买入,卖出,成交量,成交额,买①量,买①,买②量,买②,买③量,买③,买④量,买④,买⑤量,买⑤,卖①量,卖①,卖②量,卖②,卖③量,卖③,卖④量,卖④,卖⑤量,卖⑤,日期,时间'
                .split(','),
        },

        _userSettings,
        defaultUserSettings = {
            refreshInterval: 10000,
            displayColumns: [ /////////////////////////////////////////////////
                { id: 0, name: 'BB' },
                { id: 1, name: 'aa' },
                { id: 3, name: 'aa' },

                { id: 40, name: 'aa' },
                { id: 41, name: 'BB' },
                { id: 42, name: 'aa' },

                { id: 50, name: 'aa' },
                { id: 51, name: 'aa' },
                { id: 52, name: 'aa' },
                { id: 53, name: 'aa' },
                { id: 54, name: 'aa' },
                { id: 55, name: 'aa' },
                { id: 56, name: 'aa' },
                { id: 57, name: 'aa' },
                { id: 58, name: 'aa' },
            ],
            watchingStocks: [ /////////////////////////////////////////////////
                { sinaSymbol: 'sh000001', name: '【上证指数】' },
                { sinaSymbol: 'sz000002', name: '【万科A】', cost: 11.01, quantity: 2000 },
                { sinaSymbol: 'sh600036', name: '【万科A】', cost: 19.01, quantity: 3000 },
            ],
        },
        getUserSettings = function () {
            var userSettings = $.cookie(_appId);
            if (!userSettings) {
                return defaultUserSettings;
            }
            else {
                if (!(userSettings.refreshInterval >= 1000)) {
                    userSettings.refreshInterval = defaultUserSettings.refreshInterval;
                }
                if (!(userSettings.displayColumns && userSettings.displayColumns > 0)) {
                    userSettings.displayColumns = defaultUserSettings.displayColumns;
                }
                if (!userSettings.watchingStocks) {
                    userSettings.watchingStocks = defaultUserSettings.watchingStocks;
                }
                return userSettings;
            }
        },

        /******************** 初始化 ********************/
        _columnEngines = [],
        initColumnEngines = function () {
            // 远程 - 数据源栏位
            _appSettings.nameColumnId = 0;
            _appSettings.closingPriceColumnId = 2;
            _appSettings.priceColumnId = 3;
            var stockColumnsLength = _appSettings.stockColumns.length;
            for (var i = 0; i < stockColumnsLength; i++) {
                _columnEngines[i] = { id: i, name: _appSettings.stockColumns[i], siblings: _columnEngines, getClass: getClassDefault, getText: getTextDefault, getValue: getValueDefault };
            }

            // 本地扩展 - 数据源栏位
            _appSettings.sinaSymbolColumnId = 40;
            _columnEngines[_appSettings.sinaSymbolColumnId] = { id: _appSettings.sinaSymbolColumnId, name: '新浪代码', siblings: _columnEngines, getClass: getClassDefault, getText: getTextDefault, getValue: getValueDefault };

            _appSettings.costColumnId = 41;
            _columnEngines[_appSettings.costColumnId] = { id: _appSettings.costColumnId, name: '成本', siblings: _columnEngines, getClass: getClassDefault, getText: getTextForNumber, getValue: getValueDefault };

            _appSettings.quantityColumnId = 42;
            _columnEngines[_appSettings.quantityColumnId] = { id: _appSettings.quantityColumnId, name: '持有量', siblings: _columnEngines, getClass: getClassDefault, getText: getTextForNumber, getValue: getValueDefault };

            // 本地扩展 - 非数据源栏位
            _appSettings.changeColumnId = 50;
            _columnEngines[_appSettings.changeColumnId] = {
                id: _appSettings.changeColumnId, name: '涨跌', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: getTextForNumber,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.priceColumnId].getValue(data) - this.siblings[_appSettings.closingPriceColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.changeRateColumnId = 51;
            _columnEngines[_appSettings.changeRateColumnId] = {
                id: _appSettings.changeRateColumnId, name: '涨跌率', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: getTextAsPercentage,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.changeColumnId].getValue(data) / this.siblings[_appSettings.priceColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.symbolColumnId = 52;
            _columnEngines[_appSettings.symbolColumnId] = {
                id: _appSettings.symbolColumnId, name: '代码', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: function (data) {
                    if (this._text == undefined) {
                        this._text = this.siblings[_appSettings.sinaSymbolColumnId].getText(data).replace(/[^\d]/g, '');
                    }
                    return this._text;
                },
                getValue: getValueDefault
            };

            _appSettings.fullNameColumnId = 53;
            _columnEngines[_appSettings.fullNameColumnId] = {
                id: _appSettings.fullNameColumnId, name: '名称', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: function (data) {
                    if (this._text == undefined) {
                        this._text = _formatString('{2} <a title="新浪股票" href="http://biz.finance.sina.com.cn/suggest/lookup_n.php?q={0}" target="_blank">{1}</a>',
                            this.siblings[_appSettings.sinaSymbolColumnId].getText(data),
                            this.siblings[_appSettings.nameColumnId].getText(data),
                            this.siblings[_appSettings.symbolColumnId].getText(data));
                    }
                    return this._text;
                },
                getValue: getValueDefault
            };

            _appSettings.totalCostColumnId = 54;
            _columnEngines[_appSettings.totalCostColumnId] = {
                id: _appSettings.totalCostColumnId, name: '总成本', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: getTextForNumber,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.costColumnId].getValue(data) * this.siblings[_appSettings.quantityColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.totalAmountColumnId = 55;
            _columnEngines[_appSettings.totalAmountColumnId] = {
                id: _appSettings.totalAmountColumnId, name: '总现值', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: getTextForNumber,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.priceColumnId].getValue(data) * this.siblings[_appSettings.quantityColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.gainLossColumnId = 56;
            _columnEngines[_appSettings.gainLossColumnId] = {
                id: _appSettings.gainLossColumnId, name: '盈亏', siblings: _columnEngines,
                getClass: getClassForGainLoss,
                getText: getTextForNumber,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.totalAmountColumnId].getValue(data) - this.siblings[_appSettings.totalCostColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.gainLossRateColumnId = 57;
            _columnEngines[_appSettings.gainLossRateColumnId] = {
                id: _appSettings.gainLossRateColumnId, name: '盈亏率', siblings: _columnEngines,
                getClass: getClassForGainLoss,
                getText: getTextAsPercentage,
                getValue: function (data) {
                    if (this._value == undefined) {
                        this._value = this.siblings[_appSettings.gainLossColumnId].getValue(data) / this.siblings[_appSettings.totalCostColumnId].getValue(data);
                    }
                    return this._value;
                }
            };

            _appSettings.toolColumnId = 58;
            _columnEngines[_appSettings.toolColumnId] = {
                id: _appSettings.toolColumnId, name: '工具', siblings: _columnEngines,
                getClass: getClassDefault,
                getText: function (data) {
                    if (this._text == undefined) {
                        this._text = _formatString('<a title=\"技术指标\" href=\"TI.htm?{0}\" target=\"_blank\">T</a>',
                            this.siblings[_appSettings.sinaSymbolColumnId].getText(data));
                    }
                    return this._text;
                },
                getValue: getValueDefault
            };
        },
        clearColumnEnginesCache = function () {
            var columnEnginesLength = _columnEngines.length;
            for (var i = 0; i < columnEnginesLength; i++) {
                if (_columnEngines[i]) {
                    _columnEngines[i]._class = undefined;
                    _columnEngines[i]._text = undefined;
                    _columnEngines[i]._value = undefined;
                }
            }
        },
        stockRetriever = $('<iframe class="hidden"></iframe>'),
        suggestionRetriever = $('<iframe class="hidden"></iframe>'),
        _init = function () {
            // 列数据处理引擎
            initColumnEngines();
            // 远程数据容器
            $(document.body).append(stockRetriever).append(suggestionRetriever);
            // 启动
            stockRequest();
        },

        /******************** 公共方法 ********************/
        _formatString = function () {
            var args = [].slice.call(arguments);
            var pattern = new RegExp('{([0-' + (args.length - 2) + '])}', 'g');
            return args[0].replace(pattern, function (match, index) {
                return args[parseInt(index) + 1];
            });
        },
        _round = function (value, precision) {
            if (isNaN(value)) {
                return NaN;
            }
            precision = precision ? parseInt(precision) : 0;
            if (precision <= 0) {
                return Math.round(value);
            }
            return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
        },
        _getTicks = function () {
            return new Date().getTime();
        },
        _toShortNumberText = function (value) {
            if (isNaN(value)) {
                return NaN;
            }
            var unit8 = Math.pow(10, 8), unit4 = Math.pow(10, 4);
            return value >= unit8
                ? _round(value / unit8, 2) + '亿'
                : (value >= unit4 ? _round(value / unit4, 2) + '万' : _round(value, 2).toString());
        },
        _toPercentageText = function (value) {
            if (isNaN(value)) {
                return '';
            }
            return _round(value * 100, 2) + '%';
        },
        _requestData = function (retriever, args) {
            retriever.attr('src', 'data.html?' + $.param(args));
        },

        /******************** 内部方法 ********************/
        getClassDefault = function (data) {
            if (this._class == undefined) {
                var value = this.siblings[_appSettings.changeColumnId].getValue(data);
                this._class = value > 0
                    ? 'positive'
                    : (value < 0 ? 'negative' : '');
            }
            return this._class;
        },
        getTextDefault = function (data) {
            if (this._text == undefined) {
                var value = this.getValue(data);
                this._text = isNaN(value)
                    ? data[this.id]
                    : _toShortNumberText(value);
            }
            return this._text;
        },
        getValueDefault = function (data) {
            if (this._value == undefined) {
                this._value = Number(data[this.id]); // 返回数值或 NaN
            }
            return this._value;
        },
        getTextAsPercentage = function (data) {
            if (this._text == undefined) {
                this._text = _toPercentageText(this.getValue(data));
            }
            return this._text;
        },
        getClassForGainLoss = function (data) {
            if (this._class == undefined) {
                var value = this.siblings[_appSettings.gainLossColumnId].getValue(data);
                this._class = value > 0
                    ? 'btn-danger'
                    : (value < 0 ? 'btn-success' : 'btn-default');
            }
            return this._class;
        },
        getTextForNumber = function (data) {
            if (this._text == undefined) {
                this._text = _round(this.getValue(data), 2);
            }
            return this._text;
        },

        stockTimer,
        stockRequest = function () {
            if (stockTimer) {
                stockTimer = window.clearTimeout(stockTimer);
            }

            _userSettings = getUserSettings();

            // 自选列表
            var token = _getTicks();
            var args = [token]; // 注意：第一个参数是 Token，将原封不动的返回
            var stockList = '';
            var watchingStocksLength = _userSettings.watchingStocks.length;
            for (var i = 0; i < watchingStocksLength ; i++) {
                stockList += _userSettings.watchingStocks[i].sinaSymbol + ',';
                args.push('hq_str_' + _userSettings.watchingStocks[i].sinaSymbol);
            }
            _requestData(stockRetriever, {
                url: _formatString(_appSettings.stockUrl, token, stockList),
                callback: 'ShadowStock.stockCallback',
                args: args
            });
        },
        _stockCallback = function (args) {
            try {
                _stockTable.empty();
                var displayColumnsLength = _userSettings.displayColumns.length;
                var stockTableRow;

                // 表头
                var stockTableHead = $('<thead>').appendTo(_stockTable);
                stockTableRow = $('<tr>').appendTo(stockTableHead);
                for (var i = 0; i < displayColumnsLength ; i++) {
                    $('<th>').html(_columnEngines[_userSettings.displayColumns[i].id].name)
                        .appendTo(stockTableRow);
                }

                // 表体
                var stockTableBody = $('<tbody>').appendTo(_stockTable);
                for (var key in args) {
                    clearColumnEnginesCache();

                    var sinaSymbol = key.substr(key.lastIndexOf('_') + 1);
                    // 远程 - 数据源
                    var data = args[key].split(',');
                    // 本地扩展 - 数据源
                    data[_appSettings.sinaSymbolColumnId] = sinaSymbol;
                    var watchingStock = findWatchingStock(sinaSymbol);
                    if (watchingStock) {
                        data[_appSettings.costColumnId] = watchingStock.cost;
                        data[_appSettings.quantityColumnId] = watchingStock.quantity;
                    }

                    stockTableRow = $('<tr>').appendTo(stockTableBody);
                    for (var i = 0; i < displayColumnsLength ; i++) {
                        $('<td>').data('sinaSymbol', _columnEngines[_appSettings.sinaSymbolColumnId].getText(data))
                            .addClass(_columnEngines[_userSettings.displayColumns[i].id].getClass(data))
                            .html(_columnEngines[_userSettings.displayColumns[i].id].getText(data))
                            .appendTo(stockTableRow);
                    }
                }
            }
            finally {
                stockTimer = window.setTimeout(stockRequest, _userSettings.refreshInterval);
            }
        },
        findWatchingStock = function (sinaSymbol) {
            var watchingStocksLength = _userSettings.watchingStocks.length;
            for (var i = 0; i < watchingStocksLength ; i++) {
                if (_userSettings.watchingStocks[i].sinaSymbol == sinaSymbol) {
                    return _userSettings.watchingStocks[i];
                }
            }
            return null;
        },

        suggestionCache = {},
        suggestionRequest = function (term) {
            var token = term;
            var args = [token]; // 注意：第一个参数是 Token，将原封不动的返回
            var suggestionName = 'suggestion_' + _getTicks();
            args.push(suggestionName);
            _requestData(suggestionRetriever, {
                url: _formatString(_appSettings.suggestionUrl, suggestionName, escape(term)),
                callback: 'ShadowStock.suggestionCallback',
                args: args
            });
        },
        _suggestionCallback = function (args) {
            /*
            xtdh,11,002125,sz002125,湘潭电化,xtdh;
            xtdq,11,300372,sz300372,欣泰电气,xtdq;
            qxtd,11,002408,sz002408,齐翔腾达,qxtd
            */
            for (var key in args) {
                if (key == 'token') {
                    continue;
                }

                var source = [];
                var suggestions = args[key].split(';');
                var suggestionsLength = suggestions.length;
                for (var i = 0; i < suggestionsLength; i++) {
                    var suggestionColumns = suggestions[i].split(',');
                    source.push({
                        label: _formatString('{0} {1} {2}', suggestionColumns[0], suggestionColumns[2], suggestionColumns[4]),
                        value: suggestionColumns[3]
                    });
                }
                suggestionCache[args.token] = source;
                _suggestionText.autocomplete('option', 'source', source);
                break;
            }
        },

        /******************** 外部方法 ********************/
        _stockTable,
        _attachTable = function (table) {
            _stockTable = table.empty();
        },
        _suggestionText,
        _attachSuggestion = function (suggestion) {
            _suggestionText = suggestion;
            _suggestionText.autocomplete({
                minLength: 1,
                source: [],
                search: function (event, ui) {
                    var term = event.target.value;
                    if (term) {
                        if (term in suggestionCache) {
                            _suggestionText.autocomplete('option', 'source', suggestionCache[term]);
                            return;
                        }
                        suggestionRequest(term);
                    }
                }
            });
        }
    ;

    /******************** 导出 ********************/
    _shadowStock.appId = _appId;
    _shadowStock.appName = _appName;
    _shadowStock.appVersion = _appVersion;
    _shadowStock.appSettings = _appSettings;
    _shadowStock.userSettings = _userSettings;
    _shadowStock.columnEngines = _columnEngines;
    _shadowStock.stockTable = _stockTable;

    _shadowStock.formatString = _formatString;
    _shadowStock.round = _round;
    _shadowStock.getTicks = _getTicks;
    _shadowStock.toShortNumberText = _toShortNumberText;
    _shadowStock.toPercentageText = _toPercentageText;
    _shadowStock.requestData = _requestData;

    _shadowStock.attachSuggestion = _attachSuggestion;
    _shadowStock.attachTable = _attachTable;
    _shadowStock.stockCallback = _stockCallback;
    _shadowStock.suggestionCallback = _suggestionCallback;
    _shadowStock.init = _init;

    window.ShadowStock = _shadowStock;
})(this, this.document);