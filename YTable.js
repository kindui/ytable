/**
 * Author: humanhuang
 * Date: 2013-8-29
 */
function YTable(options) {

    //columns 有 onrender:function()
    var defaults = {
        columns: null,
        data: null,
        domId: null,
        dom: null,

        tableHeader: null,
        tableBody: null,
        tableFooter: null,

        sortField: null,   //排序字段
        sortName: null,    //
        selectedRow: null, //当前选中行

        dataCount: null,   //数据总数
        pageSize: 5,     //每页行数
        pageCount: null,  //总页数
        currentPage: 1,   //当前页

        height: 300,     //表格高度

        /*** 回调函数 ***/
        onPage: null,
        onSort: null,
        onSelected: null,

        originColumns: null
    }

    $.extend(this, defaults, options);
    this.originColumns = this.clone(this.columns);
    this.dom = document.getElementById(this.domId);
    this.dataCount = this.data.length;
    this.pageCount = Math.ceil(this.dataCount / this.pageSize);

    this.init();
}
YTable.prototype = {
    clone: function (obj) {
        var o;
        if (typeof obj == "object") {
            if (obj === null) {
                o = null;
            } else {
                //array
                if (obj instanceof Array) {
                    o = [];
                    for (var i = 0, len = obj.length; i < len; i++) {
                        o.push(this.clone(obj[i]));
                    }
                    //date
                } else if (Object.prototype.toString.call(obj) == "[object Date]") {
                    return new Date(obj.toString());
                } else {
                    //object
                    o = {};
                    for (var k in obj) {
                        o[k] = this.clone(obj[k]);
                    }
                }
            }
        } else {
            o = obj;
        }
        return o;
    },
    each: function (arr, callback) {
        var flag = true;
        for (var i = 0, L = arr.length; i < L; i++) {
            var ret = callback.call(this, arr[i], i);
            if (ret === false) {
                flag = false;
                break;
            }
        }
        return flag;
    },
    init: function () {
        this.adjustcolumns();
        this.buildHTML();
        this.initEvent();
    },
    adjustcolumns: function () {
        var me = this;
//        /[\u4e00-\u9fa5]/.test("你")
        var count = 0;
        this.accessColumn(function (columnItem, isGroup) {
            columnItem.index = count++;
            columnItem.isHide = columnItem.isHide || false;
            //自动调整列宽
            if (columnItem.hasOwnProperty("width") === false) {
//                columnItem.width = 100;

                var fieldId = columnItem['id'];
                var maxLength = (me.data[0][fieldId]+"").length;

                me.each(me.data,function(item,index){
                   var value  =  item[fieldId]+"";
                    if( /[\u4e00-\u9fa5]/.test(value)){
                        //中文
                        maxLength =  Math.max(maxLength,value.length*2);
                    }else{
                        maxLength =  Math.max(maxLength,value.length);
                    }
                });

                maxLength = Math.max(columnItem['text'].length*2,maxLength);
                columnItem.width = maxLength*11;
            }
        });
    },
    formatData: function (data, type) {
        var format = {
            formatInt: function (f) {
                return  format.formatFloat(f, 0);
            },
            formatFloat: function (f, precision) {
                f = f - 0;
                if (isNaN(f)) return "-";
                precision = precision === undefined ? 2 : precision;
                f = (f.toFixed(precision) + "").split(".");
                f[0] = f[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                return f.join(".");
            },
            float: function (v) {
                return format.formatInt(v);
            },
            int: function (v) {
                return format.formatFloat(v, 2);
            },
            rate: function (v) {
                var t = ((+v) * 100 + "");
                var lastI = t.indexOf(".");
                if(~lastI){
                    return t.substring(0, lastI + 3) + "%";
                }else{
                    return t+"%";
                }

            },
            money: function (v) {
            }
        }
        return  format[type](data);
    },
    buildHTML: function () {
        this.table = document.createElement("div");
        this.table.id = "ytable";
        this.table.style.position = "relative";
        this.buildHeader();
        this.buildBody();
        this.buildFooter();


        //调整宽度的2个指针
//        <div class="resize_before"></div>
//        <div class="resize_after"></div>
        var resize_before = document.createElement("div");
        resize_before.style.display = "none";
        resize_before.className = "resize_before";

        var resize_after = document.createElement("div");
        resize_after.style.display = "none";
        resize_after.className = "resize_after";

        this.table.appendChild(resize_before);
        this.table.appendChild(resize_after);

        this.table.appendChild(this.tableHeader);
        this.table.appendChild(this.tableBody);

        this.renderToDom();
        this.dom.appendChild(this.tableFooter);

        this.renderScrollBar();


    },
    buildHeader: function () {

        this.tableHeader = document.createElement("div");
        this.tableHeader.id = "ytable-head";

        //首先看有没有group值;
        var isMutiHead = false;
        $.each(this.columns, function (i, item) {
            if (item.hasOwnProperty("group") && item.group.length != 0) {
                isMutiHead = true;
            }
        });

        //多表头
        if (isMutiHead) {
            this.buildHeaderMuti();
        } else {
            this.buildHeaderLinear();
        }
    },
    /**
     * 单表头
     */
    buildHeaderLinear: function () {

        var table = document.createElement("table");
        table.className = "table_mod";
        var tableHead = document.createElement("thead");
        table.appendChild(tableHead);

        //没有分组列.
        var tr = document.createElement("tr");
        for (var i = 0; i < this.columns.length; i++) {
            var c_item = this.columns[i];
            if (c_item.group && c_item.group.length == 0) continue;
            var th = document.createElement("th");
            th.className = "t_c";
            $(th).attr("data-field", c_item['id']);
            $(th).attr("data-sort", "asc");

            c_item.width && (th.style.width = c_item.width + "px");

            th.appendChild(document.createTextNode(c_item["text"]));
            tr.appendChild(th);
        }

        tableHead.appendChild(tr);
        this.tableHeader.appendChild(table);
    },
    /**
     * 多表头
     */
    buildHeaderMuti: function () {

        var table = document.createElement("table");
        table.className = "table_mod";
        var tableHead = document.createElement("thead");
        table.appendChild(tableHead);

        //第一行
        var tr = document.createElement("tr");

        for (var col = 0; col < this.columns.length; col++) {
            var item = this.columns[col];
            if (item.hasOwnProperty("group") === false) {

                //如果没有group, 占2行
                if (item.isHide === true) {
                    continue;
                }

                var th = document.createElement("th");
                th.rowSpan = 2;
                th.className = "t_c";
                $(th).attr("data-field", item.id);
                $(th).attr("data-sort", "asc");

                item.width && (th.style.width = item.width + "px");

//                    <div style="position: relative;height: 2em">
//                        <span>姓名</span>
//                        <div class="resize_row2"></div>
//                    </div>

                /******************   th    ***************/
                var th_div = document.createElement("div");
                th_div.style.position = "relative";
                th_div.style.height = "2em";

                var th_div_span = document.createElement("span");
                th_div_span.innerHTML = item['text'];

                var th_div_resize = document.createElement("div");
                th_div_resize.className = "resize_row2";

                th_div.appendChild(th_div_span);
                th_div.appendChild(th_div_resize);

                th.appendChild(th_div);
                /******************   th    ***************/


            } else {
                //有group
                var groupLength = item.group.length;
                var group_is_hide_count = 0;
                for (var i in item.group) {
                    if (item.group[i].isHide === true) {
                        group_is_hide_count++;
                    }
                }
                if (group_is_hide_count === groupLength) {
                    continue;
                }
                var th = document.createElement("th");
                th.colSpan = groupLength - group_is_hide_count;
                th.className = "t_c";
                th.appendChild(document.createTextNode(item["text"]));
            }
            tr.appendChild(th);
        }

        tableHead.appendChild(tr);

        //第二行
        tr = document.createElement("tr");
        $.each(this.columns, function (i, item) {

            if (item.hasOwnProperty("group")) {
                //有group
                $.each(item.group, function (i, gitem) {
                    if (gitem.isHide === false) {
                        var th = document.createElement("th");
                        th.className = "t_c";
                        $(th).attr("data-field", gitem.id);
                        $(th).attr("data-sort", "asc");
                        gitem.width && (th.style.width = gitem.width + "px");


                        /******************   td    ***************/
                        var td_div = document.createElement("div");
                        td_div.style.position = "relative";

                        var td_div_span = document.createElement("span");
                        td_div_span.innerHTML = gitem['text'];

                        var td_div_resize = document.createElement("div");

                        if (item.group.length != i + 1) {
                            td_div_resize.className = "resize_row1";
                        } else {
                            td_div_resize.className = "resize_row1_last";
                        }

                        td_div.appendChild(td_div_span);
                        td_div.appendChild(td_div_resize);

                        th.appendChild(td_div);
                        /******************   td    ***************/

                        tr.appendChild(th);
                    }
                });
            }
        });

        tableHead.appendChild(tr);
        this.tableHeader.appendChild(table);
    },
    buildBody: function () {
        var me = this;
        var data = this.data;
        this.tableBody = document.createElement("div");
        this.tableBody.style['height'] = this.height + "px";
        this.tableBody.style['overflow'] = 'auto';
        this.tableBody.id = "ytable-body";

        var table = document.createElement("table");
        table.className = "table_mod";

        var tableBody = document.createElement("tbody");

        table.appendChild(tableBody);
        this.tableBody.appendChild(table)


        var start = (this.currentPage - 1) * this.pageSize;
        var end = Math.min((this.currentPage - 1) * this.pageSize + this.pageSize, this.dataCount);

        for (var i = start; i < end; i++) {

            var tr = document.createElement("tr");
            i % 2 == 0 && (tr.className = "even");
            tr.setAttribute("index", i);


            var rowData = data[i];
            this.accessColumn(function (columnItem, isGroup) {

                if (columnItem.isHide === true) {
                    return;
                }

                var td = document.createElement("td");

                //第一行
                if (i === start) {
                    td.style.width = columnItem.width + "px";
                    $(td).attr("data-field", columnItem.id);
                }

                var text = rowData[columnItem.id];

                //onrender 回调
                if ("onrender" in columnItem) {
                    var ret = columnItem.onrender(rowData[columnItem.id],rowData );
                    if (ret !== undefined) {
                        var text = ret;
                    }
                }
                //type 指定列数据类型
                if ("type" in columnItem) {
                    text = me.formatData(text, columnItem.type);
                }

                td.appendChild(document.createTextNode(text));
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        }
    },
    buildFooter: function () {
        var html = '<div id="ytable-footer" class="page_wrap clearfix">\
          <div class="paginator">\
            <span class="page-show">共' + this.pageCount + '页，当前' + this.currentPage + '页,每页显示' + this.pageSize + '</span>\
\
            <span class="page-start"></span>\
            <a class="page-prev" href="javascript:;"></a>\
            \
<span class="page-skip"><input id="ytable-input-box" type="text" maxlength="3" value="' + this.currentPage + '" style="width: 20px;">/' + this.pageCount + '</span>\
\
            <a class="page-next" href="javascript:;"></a>\
            <span class="page-end"></span>\
\
            <span class="page-skip"><a id="ytable-refresh-btn" value="go" class="button"></a></span>\
            </div>\
        </div>';

        this.tableFooter = $(html)[0];
    },
    toggleColumn: function (columnName) {
        this.accessColumn(function (columnItem) {
            if (columnItem.id == columnName) {
                columnItem.isHide = !columnItem.isHide;
            }
        });
        this.renderTableHeader();
        this.renderTableBody();
    },
    accessColumn: function (callback) {
        for (var i = 0; i < this.columns.length; i++) {
            var item = this.columns[i];
            if ("group" in item) {
                var group = item.group;
                for (var c = 0; c < group.length; c++) {
                    var iitem = group[c];
                    callback(iitem, true);
                }
            } else {
                callback(item, false);
            }
        }
    },
    hideColumn: function (columnName) {
        this.accessColumn(function (columnItem) {
            if (columnItem.id == columnName) {
                columnItem.isHide = true;
            }
        });
        this.renderTableHeader();
        this.renderTableBody();
    },
    showColumn: function (columnName) {
        this.accessColumn(function (columnItem) {
            if (columnItem.id == columnName) {
                columnItem.isHide = false;
            }
        });
        this.renderTableHeader();
        this.renderTableBody();
    },
    nextPage: function () {
        if (this.currentPage == this.pageCount) {
            return false;
        }
        this.currentPage++;
        this.renderTableBody();
        this.renderTableFooter();
        this.onPage && this.onPage(this.currentPage);

    },
    prevPage: function () {
        if (this.currentPage == 1) {
            return false;
        }
        this.currentPage--;
        this.renderTableBody();
        this.renderTableFooter();
        this.onPage && this.onPage(this.currentPage);
    },
    gotoPage: function (page) {
        if (0 < page && page < this.pageCount + 1) {
            this.currentPage = page;
            this.renderTableBody();
            this.renderTableFooter();
            this.onPage && this.onPage(this.currentPage);
        }
    },
    renderScrollBar:function(){
        //调整table body 滚动条宽度
        var width = $("#ytable-head").find("table").width();
        $("#ytable-body").width(width + 20);
    },
    renderTableBody: function () {
        this.removeTableBody();
        this.buildBody();
        this.table.appendChild(this.tableBody);

        this.renderScrollBar();
    },
    renderTableFooter: function () {
        this.removeTableFooter();
        this.buildFooter();
        this.dom.appendChild(this.tableFooter);
    },
    renderTableHeader: function () {
        this.removeTableHeader();
        this.buildHeader();
        this.table.appendChild(this.tableHeader);
    },
    removeTableBody: function () {
        this.tableBody.parentNode.removeChild(this.tableBody);
    },
    removeTableHeader: function () {
        this.tableHeader.parentNode.removeChild(this.tableHeader);
    },
    removeTableFooter: function () {
        $("#ytable-footer").remove();
    },
    renderToDom: function () {
        var tableWrap = document.createElement("div");
        tableWrap.appendChild(this.table)
        this.dom.appendChild(tableWrap);
    },
    initEvent: function () {
        var self = this;
        var domId = "#" + this.domId;
        //点击列头排序
        $(domId).delegate("th", "click", function (e) {
            var target = this;
            self.sortField = target.getAttribute("data-value");
            self.sortName = target.innerHTML;
            var sortType = $(target).attr("data-sort");
            self.sortField = $(target).attr("data-field");
            if (sortType == "asc") {
                self.sort(false);
                target.setAttribute("data-sort", "desc");
            } else if (sortType = "desc") {
                self.sort(true);
                target.setAttribute("data-sort", "asc");
            }
        });
        //点击td回调
        $(domId).delegate("td", "click", function (e) {
            self.selectedRow = self.data[this.parentNode.getAttribute("index")];
            self.onSelected && self.onSelected(self.selectedRow);
        });

        //分页按钮,刷新按钮
        $(this.dom).delegate(".page-next", "click",function () {
            self.nextPage();
        }).delegate(".page-prev", "click",function () {
                self.prevPage();
            }).delegate(".page-start", "click",function () {
                self.gotoPage(1);
            }).delegate(".page-end", "click",function () {
                self.gotoPage(self.pageCount);
            }).delegate("#ytable-refresh-btn", "click", function () {
                self.gotoPage($("#ytable-input-box").val());
            });

        //调整列宽
        var resize_down = false;
        var $th;

        $(this.table).delegate(".resize_row2,.resize_row1,.resize_row1_last", "mousedown", function (e) {
            resize_down = true;
            var $this = $(this),
                left = $this.offset().left - $(self.table).offset().left;

            $th = $this.closest("th");
            $(".resize_after").css("left", left);
            $(".resize_before").css("left", left - $th.width());
            $(".resize_after").show();
            $(".resize_before").show();

            //取消文字选择
            document.body.onselectstart = function () {
                return false;
            };

            e.stopPropagation();
        });
        $(this.table).mousemove(function (e) {
            if (resize_down) {
                $(".resize_after").css("left", e.pageX - $(self.table).offset().left);
            }
        }).mouseup(function (e) {
                if (resize_down) {

                    var width = $(".resize_after").offset().left - $(".resize_before").offset().left;
                    var field = $th.attr("data-field");
                    //修改columns的width
                    for (var i = 0, L = self.columns.length; i < L; i++) {
                        var item = self.columns[i];
                        if ("group" in item) {
                            for (var c = 0, LL = item.group.length; c < LL; c++) {
                                var gitem = item.group[c];
                                if (gitem['id'] == field) {
                                    gitem.width = width;
                                    break;
                                }
                            }
                        } else {
                            if (item['id'] == field) {
                                item.width = width;
                                break;
                            }
                        }

                    }

                    $th.width(width);

                    $(self.tableBody).find("tbody").first().find("[data-field=" + field + "]").width(width);
                    resize_down = false;
                    $(".resize_after").hide();
                    $(".resize_before").hide();

                    //恢复文字选择
                    document.body.onselectstart = function () {
                        return true;
                    };

                    self.renderScrollBar();
                }
            }).mouseleave(function () {
                resize_down = false;
                $(".resize_after").hide();
                $(".resize_before").hide();

                //恢复文字选择
                document.body.onselectstart = function () {
                    return true;
                };

                self.renderScrollBar();

            });

    },
    sort: function (isAsc) {
        var self = this;
        var asc = isAsc ? 1 : -1;
        this.data.sort(function (a, b) {
            var row1 = isNaN(a[self.sortField]) ? a[self.sortField] : +a[self.sortField];
            var row2 = isNaN(b[self.sortField]) ? b[self.sortField] : +b[self.sortField];
            return (row1 - row2) * asc;
        });
        this.currentPage = 1;
        this.renderTableBody();
        this.renderTableFooter();
        this.onSort && this.onSort(this.sortField, this.sortName, asc);
    }
}