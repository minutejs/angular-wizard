/// <reference path="../../../minute/_all.d.ts" />
var Minute;
(function (Minute) {
    var AngularWizard = (function () {
        function AngularWizard($rootScope, $compile, $timeout, $http, $templateCache, $minute) {
            var _this = this;
            this.$rootScope = $rootScope;
            this.$compile = $compile;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$templateCache = $templateCache;
            this.$minute = $minute;
            this.restrict = 'AE';
            this.replace = false;
            this.require = 'ngModel';
            this.scope = { steps: '=', config: '=?', ngModel: '=?' };
            this.template = "\n        <div class=\"box\">\n            <div class=\"box-header with-border\">\n                <div class=\"box-title\">{{steps[wizard.index].heading || config.title || 'Wizard'}}</div>\n        \n                <div class=\"box-tools hidden-xs\" ng-if=\"!!config.icons\">\n                    <div class=\"btn-group\" role=\"group\">\n                        <button type=\"button\" class=\"btn btn-flat btn-xs {{$index == wizard.index && 'btn-info' || 'btn-default'}}\" ng-repeat=\"step in steps\"\n                                ng-click=\"wizard.jump($index)\"><i class=\"fa fa-fw {{step.icon}}\" tooltip=\"{{step.iconText}}\"></i></button>\n                    </div>\n                </div>\n            </div>\n            <div class=\"item box-body pre-scrollable\" style=\"min-height: {{config.minHeight || 350}}px; position: relative; overflow-x: hidden; overflow-y: auto; margin: 0 26px;\">\n                <div style=\"position: absolute; width:100%;\" id=\"loaderDiv\">\n                    <div ng-include src=\"wizard.template\"></div>\n                </div>\n                <div style=\"position: absolute; width:100%;\" id=\"preloaderDiv\">\n                    <div ng-include src=\"wizard.preload\"></div>\n                </div>\n            </div>\n            <div class=\"box-footer with-border\">\n                <div class=\"pull-left\" ng-if=\"!!wizard.config.buttons.length\">\n                    <span ng-repeat=\"button in wizard.config.buttons\">\n                        <button type=\"button\" class=\"{{button.btnClass || 'btn btn-flat btn-default btn-sm'}}\" ng-click=\"run(button.click)\" ng-show=\"!button.show || $eval(button.show)\">\n                            <i ng-show=\"button.icon\" class=\"fa {{button.icon}}\"></i> {{button.label || 'Help'}}\n                        </button>\n                    </span>\n                </div>\n                <div class=\"pull-right\">\n                    <button type=\"button\" class=\"btn btn-flat btn-default\" ng-disabled=\"!wizard.index\" ng-show=\"!config.hideBackButton\" ng-click=\"wizard.call('back')\">\n                        <i class=\"fa fa-caret-left\"></i> <span translate=\"\">Back</span>\n                    </button>\n                    <button type=\"submit\" class=\"btn btn-flat btn-primary text-bold\" ng-disabled=\"((wizard.index >= steps.length - 1) || !!wizard.loading || !wizard.nextEnabled())\" ng-click=\"wizard.call('next')\">\n                        <span style=\"padding: 0 20px;\"><span translate=\"\">Next</span> <i class=\"fa fa-caret-right\"></i></span>\n                    </button>\n                </div>\n            </div>\n        </div>";
            //link = ($scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes, ngModel: ng.INgModelController) =>
            this.controller = function ($scope) {
                var init = false;
                $scope.wizard = { global: {}, config: $scope.config, loading: false };
                $scope.project = $scope.ngModel;
                $scope.session = _this.$rootScope.session;
                var getMaxIndex = function () {
                    var jump = $scope.config.jumps;
                    return jump === 'all' ? $scope.steps.length - 1 : (jump === 'restricted' ? ($scope.project.wizard ? parseInt($scope.project.wizard.maxIndex || 0) : 0) : 0);
                };
                var setMaxIndex = function (index) {
                    if ($scope.config.jumps === 'restricted') {
                        angular.extend($scope.project, { wizard: { maxIndex: index } });
                    }
                };
                $scope.wizard.call = function (fName) {
                    var fn = $scope.wizard.overrides[fName] || $scope.wizard[fName];
                    return fn();
                };
                $scope.wizard.next = function () {
                    $scope.wizard.loading = true;
                    var form = $scope.wizard.activeDiv ? $scope.wizard.activeDiv.find('form:not([novalidate])').first() : null;
                    if (form && form.length && !form[0].checkValidity()) {
                        var submit = form.find(':submit');
                        if (!submit.length) {
                            $('<input type="submit">').hide().appendTo(form).click().remove();
                        }
                        else {
                            submit.click();
                        }
                    }
                    else {
                        var index_1 = typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0);
                        var next = function () {
                            var step = $scope.wizard.load(index_1 + 1, true);
                            if (step && typeof $scope.config.onNext === 'function') {
                                $scope.config.onNext(step);
                            }
                        };
                        if (typeof $scope.config.submit === 'function') {
                            var result = $scope.config.submit();
                            if (result instanceof Promise) {
                                result.then(next); //.catch(() => 1);
                            }
                            else {
                                next();
                            }
                        }
                        else {
                            next();
                        }
                    }
                };
                $scope.wizard.back = function () {
                    var step = $scope.wizard.load(typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0) - 1, false);
                    if (step && typeof $scope.config.onBack === 'function') {
                        $scope.config.onBack(step);
                    }
                };
                $scope.wizard.help = function (topic, popup) {
                    if (popup === void 0) { popup = false; }
                    window.open('/members/help/' + topic, popup ? 'popup' : '_blank', popup ? 'width=640,height=480' : '');
                };
                $scope.wizard.jump = function (index) {
                    var mode = $scope.config.jumps || 'none';
                    if ((mode === 'all') || (mode === 'restricted' && index <= getMaxIndex())) {
                        $scope.wizard.load(index, true);
                    }
                };
                $scope.wizard.load = function (index, ltr) {
                    var interval = $scope.config.interval || 500;
                    if (index >= 0 && index < $scope.steps.length) {
                        $scope.wizard.index = index;
                        setMaxIndex(Math.max(index, getMaxIndex()));
                        var step_1 = $scope.wizard.getUrl($scope.steps[index]);
                        var loaderDiv_1 = $('#loaderDiv');
                        var preloaderDiv_1 = $('#preloaderDiv');
                        angular.extend($scope.wizard, { submit: null, activeDiv: loaderDiv_1, nextEnabled: function () { return true; }, overrides: {} });
                        if (!$scope.wizard.template) {
                            $scope.wizard.template = step_1;
                        }
                        else {
                            if (!$scope.wizard.preloader) {
                                $scope.wizard.preload = null;
                                _this.$timeout(function () {
                                    $scope.wizard.preload = step_1;
                                    $scope.wizard.activeDiv = preloaderDiv_1;
                                    $scope.wizard.preloader = true;
                                    loaderDiv_1.finish().css('left', '0');
                                    preloaderDiv_1.finish().css('left', ltr ? '100%' : '-100%');
                                    loaderDiv_1.animate({ left: ltr ? '-100%' : '100%' }, interval);
                                    preloaderDiv_1.animate({ left: '0' }, interval);
                                });
                            }
                            else {
                                $scope.wizard.template = null;
                                _this.$timeout(function () {
                                    $scope.wizard.template = step_1;
                                    $scope.wizard.preloader = false;
                                    loaderDiv_1.finish().css('left', ltr ? '100%' : '-100%');
                                    preloaderDiv_1.finish().css('left', '0');
                                    loaderDiv_1.animate({ left: 0 }, interval);
                                    preloaderDiv_1.animate({ left: ltr ? '-100%' : '100%' }, interval);
                                });
                            }
                        }
                        window.history.pushState({ index: index + 1 }, $scope.steps[index].heading || 'Wizard', '#!/' + $scope.steps[index].url);
                        _this.$timeout(function () { return $scope.wizard.activeDiv.find('.auto-focus:first').focus(); }, interval + 250);
                        _this.$timeout(function () { return $scope.wizard.loading = false; });
                        return step_1;
                    }
                    return null;
                };
                $scope.wizard.getUrl = function (step) {
                    return '/members/wizard/step/' + step.url;
                };
                $scope.$watch('steps', function (steps) {
                    if (steps && steps.length > 1) {
                        angular.forEach(steps, function (step) {
                            _this.$http.get($scope.wizard.getUrl(step), { cache: _this.$templateCache });
                        });
                        if (!init) {
                            init = true;
                            _this.$timeout(function () {
                                var start = $.trim((window.location.hash || '').replace(/^#!\//, ''));
                                var step = start ? Minute.Utils.findWhere($scope.steps, { url: start }) : $scope.steps[0];
                                if (step) {
                                    var index = $scope.steps.indexOf(step);
                                    $scope.wizard.load(index === -1 ? 0 : index <= getMaxIndex() ? index : 0, true);
                                }
                            });
                        }
                    }
                });
                $scope.run = function (code) {
                    if (typeof code == 'function') {
                        code();
                    }
                };
                window.onpopstate = function (event) {
                    if (event && event.state && event.state.index > 0) {
                    }
                };
            };
        }
        AngularWizard.factory = function () {
            var directive = function ($rootScope, $compile, $timeout, $http, $templateCache, $minute) {
                return new AngularWizard($rootScope, $compile, $timeout, $http, $templateCache, $minute);
            };
            directive.$inject = ["$rootScope", "$compile", "$timeout", "$http", "$templateCache", "$minute"];
            return directive;
        };
        return AngularWizard;
    }());
    Minute.AngularWizard = AngularWizard;
    angular.module('AngularWizard', ['MinuteFramework'])
        .config(['$controllerProvider', function ($controllerProvider) { return angular.module('WizardApp').controller = $controllerProvider.register; }])
        .directive('angularWizard', AngularWizard.factory());
})(Minute || (Minute = {}));
