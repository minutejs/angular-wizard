/// <reference path="../../../minute/_all.d.ts" />
var Minute;
(function (Minute) {
    var AngularWizard = (function () {
        function AngularWizard($compile, $timeout, $http, $templateCache) {
            var _this = this;
            this.$compile = $compile;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$templateCache = $templateCache;
            this.restrict = 'AE';
            this.replace = false;
            this.require = 'ngModel';
            this.scope = { steps: '=', options: '=?', ngModel: '=?' };
            this.template = "\n        <div class=\"box\">\n            <div class=\"box-header with-border\">\n                <div class=\"box-title\">{{steps[wizard.index].heading || options.title || 'Wizard'}}</div>\n        \n                <div class=\"box-tools hidden-xs\" ng-if=\"!!options.icons\">\n                    <div class=\"btn-group\" role=\"group\">\n                        <button type=\"button\" class=\"btn btn-default btn-flat btn-xs {{$index == wizard.index && 'active' || ''}}\" ng-repeat=\"step in steps\"\n                                ng-click=\"wizard.jump($index)\"><i class=\"fa fa-fw {{step.icon}}\" tooltip=\"{{step.iconText}}\"></i></button>\n                    </div>\n                </div>\n            </div>\n            <div class=\"item box-body pre-scrollable\" style=\"min-height: {{options.minHeight || 350}}px; position: relative; overflow-x: hidden; overflow-y: auto;\">\n                <div style=\"position: absolute; width: 96%; padding: 0 20px\" id=\"loaderDiv\">\n                    <div ng-include src=\"wizard.template\"></div>\n                </div>\n                <div style=\"position: absolute; width: 96%; padding: 0 20px\" id=\"preloaderDiv\">\n                    <div ng-include src=\"wizard.preload\"></div>\n                </div>\n            </div>\n            <div class=\"box-footer with-border\">\n                <div class=\"pull-right\">\n                    <button type=\"button\" class=\"btn btn-flat btn-default\" ng-disabled=\"!wizard.index\" ng-show=\"!options.hideBackButton\" ng-click=\"wizard.back()\">\n                        <i class=\"fa fa-caret-left\"></i> <span translate=\"\">Back</span>\n                    </button>\n                    <button type=\"submit\" class=\"btn btn-flat btn-primary text-bold\" ng-disabled=\"((wizard.index >= steps.length - 1) || !wizard.nextEnabled())\" ng-click=\"wizard.next()\">\n                        <span style=\"padding: 0 20px;\"><span translate=\"\">Next</span> <i class=\"fa fa-caret-right\"></i></span>\n                    </button>\n                </div>\n            </div>\n        </div>";
            this.link = function ($scope, element, attrs, ngModel) {
                var init = false;
                $scope.wizard = {};
                $scope.form = $scope.ngModel;
                var getMaxIndex = function () {
                    var jump = $scope.options.jumps;
                    return jump === 'all' ? $scope.steps.length - 1 : (jump === 'restricted' ? ($scope.form.wizard ? parseInt($scope.form.wizard.maxIndex || 0) : 0) : 0);
                };
                var setMaxIndex = function (index) {
                    if ($scope.options.jumps === 'restricted') {
                        angular.extend($scope.form, { wizard: { maxIndex: index } });
                    }
                };
                $scope.wizard.next = function () {
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
                            if (step && typeof $scope.options.onNext === 'function') {
                                $scope.options.onNext(step);
                            }
                        };
                        if (typeof $scope.wizard.submit === 'function') {
                            $scope.wizard.submit().then(next); //.catch(() => 1);
                        }
                        else {
                            next();
                        }
                    }
                };
                $scope.wizard.back = function () {
                    var step = $scope.wizard.load(typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0) - 1, false);
                    if (step && typeof $scope.options.onBack === 'function') {
                        $scope.options.onBack(step);
                    }
                };
                $scope.wizard.jump = function (index) {
                    var mode = $scope.options.jumps || 'none';
                    if ((mode === 'all') || (mode === 'restricted' && index <= getMaxIndex())) {
                        $scope.wizard.load(index, true);
                    }
                };
                $scope.wizard.load = function (index, ltr) {
                    var interval = $scope.options.interval || 500;
                    if (index >= 0 && index < $scope.steps.length) {
                        $scope.wizard.index = index;
                        setMaxIndex(Math.max(index, getMaxIndex()));
                        var step_1 = $scope.wizard.getUrl($scope.steps[index]);
                        var loaderDiv_1 = $('#loaderDiv');
                        var preloaderDiv_1 = $('#preloaderDiv');
                        $scope.wizard.submit = null;
                        $scope.wizard.activeDiv = loaderDiv_1;
                        $scope.wizard.nextEnabled = function () { return true; };
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
                        window.history.pushState($scope.steps[index].title, $scope.steps[index].title, '/members/wizard#/' + $scope.steps[index].url);
                        _this.$timeout(function () { return $scope.wizard.activeDiv.find('.auto-focus:first').focus(); }, interval + 100);
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
                                var start = $.trim((window.location.hash || '').replace(/^#\//, ''));
                                var step = start ? Minute.Utils.findWhere($scope.steps, { url: start }) : null;
                                if (step) {
                                    var index = $scope.steps.indexOf(step);
                                    $scope.wizard.load(index === -1 ? 0 : index <= getMaxIndex() ? index : 0, true);
                                }
                            });
                        }
                    }
                });
            };
        }
        AngularWizard.factory = function () {
            var directive = function ($compile, $timeout, $http, $templateCache) { return new AngularWizard($compile, $timeout, $http, $templateCache); };
            directive.$inject = ["$compile", "$timeout", "$http", "$templateCache"];
            return directive;
        };
        return AngularWizard;
    }());
    Minute.AngularWizard = AngularWizard;
    angular.module('AngularWizard', [])
        .directive('angularWizard', AngularWizard.factory());
    angular.module('AngularWizard').config(['$controllerProvider', function ($controllerProvider) {
            angular.module('WizardApp').controller = $controllerProvider.register;
        }]);
})(Minute || (Minute = {}));
