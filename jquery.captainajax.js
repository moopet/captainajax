(function($) {

// uses a very neat form-to-json plugin by Tobias Cohen from
// http://stackoverflow.com/questions/1184624/serialize-form-to-json-with-jquery
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };

    $.captainAjax = function(options) {
        $.captainAjax.processRequest.call(this, options);
        return false;
    };

    $.fn.captainAjax = function(options) {
        // live() will only bind to direct selectors and
        // we must capture submit instead of click for forms
        $(this).live('submit click', function(event) {
            if (event.currentTarget.tagName === 'FORM'
                && event.originalEvent.type === 'click') {
                    return;
            }
            $.captainAjax.processRequest.call(this, options);
            return false;
        });
        return this;
    };

    $.captainAjax.defaults = {
        allowConcurrentDuplicates: false,
        async: true,
        beforeSend: function(){},
        cache: false,
        complete: function(){},
        context: false,
        data: {},
        global: true,
        ifModified: true,
        method: 'GET',
        onBusy: function(){},
        onIdle: function(){},
        password: '',
        success: function(){},
        username: '',
        url: false,

        alert: function(data) {
            if (typeof(data) === 'object') {
                data = data.join("\n");
            }
            alert(data);
        },
        dom_add_class: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(key, value){
                    $(key).addClass(value);
                });
            }
        },
        dom_remove_class: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(key, value){
                    $(key).removeClass(value);
                });
            }
        },
        dom_replace: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(selector, content) {
                    $(selector).append(content).remove();
                });
            }
        },
        dom_append: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(selector, content) {
                    $(selector).append(content);
                });
            }
        },
        dom_content: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(selector, content) {
                    $(selector).html(content);
                });
            }
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            $.captainAjax.logMessage({
                timestamp: new Date(),
                level: 'error',
                message: 'Error ' + textStatus + ': ' + errorThrown
            });
        },
        redirect: function(data) {
            if (typeof(data) === 'string') {
                window.location = data;
            }
        },
        status: function(data) {
            if (typeof(data) === 'string') {
                window.status = data;
            }
        },
        window_title: function(data) {
            if (typeof(data) === 'string') {
                document.title = data;
            }
        },
        value: function(data) {
            if (typeof(data) === 'object') {
                $.each(data, function(key, value){
                    $('[name=' + key + ']').val(value);
                });
            }
        }
    };

    $.captainAjax.stack = [];

    $.captainAjax.config = function(config) {
        $.captainAjax.defaults = $.extend(true, $.captainAjax.defaults, config);
    };

    $.captainAjax.logMessage = function(data) {
        if (typeof(console) === 'object') {
            if (typeof(data) == 'string') {
                var date = new Date();
                console.log(date.getHours() + ':' + date.getMinutes() + ':'
                            + date.getSeconds() + '|notice|' + data);
            } else {
                $.each(data, function(key, value) {
                    var date = new Date(value.timestamp * 1000);
                    console.log(date.getHours() + ':' + date.getMinutes() + ':'
                                + date.getSeconds() + '|' + value.level + '|'
                                + value.message);
                });
            }
        }
    };

    $.captainAjax.isIdle = function() {
        return $.captainAjax.stack.length === 0;
    };

    $.captainAjax.processRequest = function(options) {
        var options = $.extend(true, $.captainAjax.defaults, options);
        var isForm = $(this)[0].tagName === 'FORM';

        options.url = options.url || $(this).attr('href') || $(this).attr('action');
        if (!options.url && isForm) {
            options.url = window.location.href;
        }
        else if (!options.url) {
            $.captainAjax.logMessage('captainAjax: no URL, nothing to do!');
            return false;
        }

        if (!options.allowConcurrentDuplicates) {
            var match = false;
            $.each($.captainAjax.stack, function(url) {
                if (url === options.url) {
                    match = true;
                }
            });
            if (match) {
                $.captainAjax.logMessage('captainAjax: ignoring duplicate request');
                return false;
            }
        }

        if (isForm) {
            options.data = $.extend(true, options.data, $(this).serializeObject());
            options.data['form_sumbitted'] = 1;
        }

        if ($.captainAjax.isIdle() && typeof(options.onBusy) === 'function') {
            options.onBusy.call(this);
        }
        $.captainAjax.stack.push(options.url);
        $(this).addClass('ajax-busy');

        options.data.dom_id = $(this).attr('id');

        $.ajax({
            async: options.async,
            context: options.context,
            cache: options.cache,
            complete: function(XMLHttpRequest, textStatus) {
                if (!options.allowConcurrentDuplicates) {
                    var tmp = [];
                    $.each($.captainAjax.stack, function(url) {
                        if (url !== options.url) {
                            tmp.push(url);
                        }
                    });
                    $.captainAjax.stack = tmp;
                }

                $(this).removeClass('ajax-busy');
                if (typeof(options.complete) === 'function') {
                    options.complete(XMLHttpRequest, textStatus);
                }
                if ($.captainAjax.isIdle() && typeof(options.onIdle) === 'function') {
                    options.onIdle.call(this);
                }
            },
            data: typeof(options.data) === 'function' ? options.data.call(this) : options.data,
            dataType: 'json',
            error: options.error,
            global: options.global,
            ifModified: options.ifModified,
            success: function(response, textStatus, XMLHttpRequest) {
                if (typeof(response) === 'object') {
                    $.each(response.control, function(key, value) {
                    // reserved for private oob commands
                    });
                    $.each(response.data, function(key, value){
                        if (typeof(options[key]) === 'function') {
                            options[key].call(this, value);
                        } else if (key === 'log_message') {
                            $.captainAjax.logMessage(value);
                        }
                    });
                }

                if (typeof(options.success) === 'function') {
                    options.success(data, textStatus, XMLHttpRequest);
                }
            },
            type: options.method,
            username: options.username,
            url: options.url
        });
    }
})(jQuery);
