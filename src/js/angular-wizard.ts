/// <reference path="../../../minute/_all.d.ts" />

module Minute {
    export class AngularWizard implements ng.IDirective {
        restrict = 'AE';
        replace = false;
        require = 'ngModel';
        scope: any = {steps: '=', options: '=?', ngModel: '=?'};

        template: string = `
        <div class="box">
            <div class="box-header with-border">
                <div class="box-title">{{steps[wizard.index].heading || options.title || 'Wizard'}}</div>
        
                <div class="box-tools hidden-xs" ng-if="!!options.icons">
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-default btn-flat btn-xs {{$index == wizard.index && 'active' || ''}}" ng-repeat="step in steps"
                                ng-click="wizard.jump($index)"><i class="fa fa-fw {{step.icon}}" tooltip="{{step.iconText}}"></i></button>
                    </div>
                </div>
            </div>
            <div class="item box-body pre-scrollable" style="min-height: {{options.minHeight || 350}}px; position: relative; overflow-x: hidden; overflow-y: auto;">
                <div style="position: absolute; width: 96%; padding: 0 20px" id="loaderDiv">
                    <div ng-include src="wizard.template"></div>
                </div>
                <div style="position: absolute; width: 96%; padding: 0 20px" id="preloaderDiv">
                    <div ng-include src="wizard.preload"></div>
                </div>
            </div>
            <div class="box-footer with-border">
                <div class="pull-right">
                    <button type="button" class="btn btn-flat btn-default" ng-disabled="!wizard.index" ng-show="!options.hideBackButton" ng-click="wizard.back()">
                        <i class="fa fa-caret-left"></i> <span translate="">Back</span>
                    </button>
                    <button type="submit" class="btn btn-flat btn-primary text-bold" ng-disabled="((wizard.index >= steps.length - 1) || !wizard.nextEnabled())" ng-click="wizard.next()">
                        <span style="padding: 0 20px;"><span translate="">Next</span> <i class="fa fa-caret-right"></i></span>
                    </button>
                </div>
            </div>
        </div>`;

        constructor(private $compile: ng.ICompileService, private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private $templateCache: ng.ITemplateCacheService) {
        }

        static factory(): ng.IDirectiveFactory {
            var directive: ng.IDirectiveFactory = ($compile: ng.ICompileService, $timeout: ng.ITimeoutService, $http: ng.IHttpService, $templateCache: ng.ITemplateCacheService) => new AngularWizard($compile, $timeout, $http, $templateCache);
            directive.$inject = ["$compile", "$timeout", "$http", "$templateCache"];
            return directive;
        }

        link = ($scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes, ngModel: ng.INgModelController) => {
            let init = false;

            $scope.wizard = {};
            $scope.form = $scope.ngModel;

            let getMaxIndex = () => {
                let jump = $scope.options.jumps;
                return jump === 'all' ? $scope.steps.length - 1 : (jump === 'restricted' ? ($scope.form.wizard ? parseInt($scope.form.wizard.maxIndex || 0) : 0) : 0);
            };

            let setMaxIndex = (index) => {
                if ($scope.options.jumps === 'restricted') {
                    angular.extend($scope.form, {wizard: {maxIndex: index}});
                }
            };

            $scope.wizard.next = () => {
                let form = $scope.wizard.activeDiv ? $scope.wizard.activeDiv.find('form:not([novalidate])').first() : null;

                if (form && form.length && !form[0].checkValidity()) {
                    let submit = form.find(':submit');

                    if (!submit.length) {
                        $('<input type="submit">').hide().appendTo(form).click().remove();
                    } else {
                        submit.click();
                    }
                } else {
                    let index = typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0);
                    let next = () => {
                        let step = $scope.wizard.load(index + 1, true);

                        if (step && typeof $scope.options.onNext === 'function') {
                            $scope.options.onNext(step);
                        }
                    };

                    if (typeof $scope.wizard.submit === 'function') {
                        $scope.wizard.submit().then(next);//.catch(() => 1);
                    } else {
                        next();
                    }
                }
            };

            $scope.wizard.back = () => {
                let step = $scope.wizard.load(typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0) - 1, false);

                if (step && typeof $scope.options.onBack === 'function') {
                    $scope.options.onBack(step);
                }
            };

            $scope.wizard.jump = (index) => {
                let mode = $scope.options.jumps || 'none';

                if ((mode === 'all') || (mode === 'restricted' && index <= getMaxIndex())) {
                    $scope.wizard.load(index, true);
                }
            };

            $scope.wizard.load = (index: number, ltr: boolean) => {
                let interval = $scope.options.interval || 500;

                if (index >= 0 && index < $scope.steps.length) {
                    $scope.wizard.index = index;

                    setMaxIndex(Math.max(index, getMaxIndex()));

                    let step = $scope.wizard.getUrl($scope.steps[index]);
                    let loaderDiv = $('#loaderDiv');
                    let preloaderDiv = $('#preloaderDiv');

                    $scope.wizard.submit = null;
                    $scope.wizard.activeDiv = loaderDiv;
                    $scope.wizard.nextEnabled = () => true;

                    if (!$scope.wizard.template) {
                        $scope.wizard.template = step;
                    } else {
                        if (!$scope.wizard.preloader) {
                            $scope.wizard.preload = null;
                            this.$timeout(() => {
                                $scope.wizard.preload = step;
                                $scope.wizard.activeDiv = preloaderDiv;
                                $scope.wizard.preloader = true;

                                loaderDiv.finish().css('left', '0');
                                preloaderDiv.finish().css('left', ltr ? '100%' : '-100%');

                                loaderDiv.animate({left: ltr ? '-100%' : '100%'}, interval);
                                preloaderDiv.animate({left: '0'}, interval);
                            });
                        } else {
                            $scope.wizard.template = null;
                            this.$timeout(() => {
                                $scope.wizard.template = step;
                                $scope.wizard.preloader = false;

                                loaderDiv.finish().css('left', ltr ? '100%' : '-100%');
                                preloaderDiv.finish().css('left', '0');

                                loaderDiv.animate({left: 0}, interval);
                                preloaderDiv.animate({left: ltr ? '-100%' : '100%'}, interval);
                            });
                        }
                    }

                    window.history.pushState($scope.steps[index].title, $scope.steps[index].title, '/members/wizard#/' + $scope.steps[index].url);
                    this.$timeout(() => $scope.wizard.activeDiv.find('.auto-focus:first').focus(), interval + 100);

                    return step;
                }

                return null;
            };

            $scope.wizard.getUrl = (step: any) => {
                return '/members/wizard/step/' + step.url;
            };

            $scope.$watch('steps', (steps) => {
                if (steps && steps.length > 1) {
                    angular.forEach(steps, (step) => {
                        this.$http.get($scope.wizard.getUrl(step), {cache: this.$templateCache});
                    });

                    if (!init) {
                        init = true;

                        this.$timeout(() => {
                            let start = $.trim((window.location.hash || '').replace(/^#\//, ''));
                            let step = start ? Minute.Utils.findWhere($scope.steps, {url: start}) : null;
                            if (step) {
                                let index = $scope.steps.indexOf(step);
                                $scope.wizard.load(index === -1 ? 0 : index <= getMaxIndex() ? index : 0, true);
                            }
                        });
                    }
                }
            });
        }
    }

    angular.module('AngularWizard', [])
        .directive('angularWizard', AngularWizard.factory());

    angular.module('AngularWizard').config(['$controllerProvider', function ($controllerProvider) {
        angular.module('WizardApp').controller = $controllerProvider.register;
    }]);
}