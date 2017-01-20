/// <reference path="../../../minute/_all.d.ts" />

module Minute {
    export class AngularWizard implements ng.IDirective {
        restrict = 'AE';
        replace = false;
        require = 'ngModel';
        scope: any = {steps: '=', config: '=?', ngModel: '=?'};

        template: string = `
        <div class="box">
            <div class="box-header with-border">
                <div class="box-title">{{steps[wizard.index].heading || config.title || 'Wizard'}}</div>
        
                <div class="box-tools hidden-xs" ng-if="!!config.icons">
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-flat btn-xs {{$index == wizard.index && 'btn-info' || 'btn-default'}}" ng-repeat="step in steps"
                                ng-click="wizard.jump($index)"><i class="fa fa-fw {{step.icon}}" tooltip="{{step.iconText}}"></i></button>
                    </div>
                </div>
            </div>
            <div class="item box-body pre-scrollable" style="min-height: {{config.minHeight || 350}}px; position: relative; overflow-x: hidden; overflow-y: auto;">
                <div style="position: absolute; width: 96%; padding: 0 20px" id="loaderDiv">
                    <div ng-include src="wizard.template"></div>
                </div>
                <div style="position: absolute; width: 96%; padding: 0 20px" id="preloaderDiv">
                    <div ng-include src="wizard.preload"></div>
                </div>
            </div>
            <div class="box-footer with-border">
                <div class="pull-left" ng-if="!!wizard.config.buttons.length">
                    <span ng-repeat="button in wizard.config.buttons">
                        <button type="button" class="{{button.btnClass || 'btn btn-flat btn-default btn-sm'}}" ng-click="run(button.click)" ng-show="!button.show || $eval(button.show)">
                            <i ng-show="button.icon" class="fa {{button.icon}}"></i> {{button.label || 'Help'}}
                        </button>
                    </span>
                </div>
                <div class="pull-right">
                    <button type="button" class="btn btn-flat btn-default" ng-disabled="!wizard.index" ng-show="!config.hideBackButton" ng-click="wizard.call('back')">
                        <i class="fa fa-caret-left"></i> <span translate="">Back</span>
                    </button>
                    <button type="submit" class="btn btn-flat btn-primary text-bold" ng-disabled="((wizard.index >= steps.length - 1) || !!wizard.loading || !wizard.nextEnabled())" ng-click="wizard.call('next')">
                        <span style="padding: 0 20px;"><span translate="">Next</span> <i class="fa fa-caret-right"></i></span>
                    </button>
                </div>
            </div>
        </div>`;

        constructor(private $rootScope: any, private $compile: ng.ICompileService, private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private $templateCache: ng.ITemplateCacheService,
                    private $minute: any) {
        }

        static factory(): ng.IDirectiveFactory {
            let directive: ng.IDirectiveFactory = ($rootScope: ng.IRootScopeService, $compile: ng.ICompileService, $timeout: ng.ITimeoutService, $http: ng.IHttpService,
                                                   $templateCache: ng.ITemplateCacheService, $minute: any) => new AngularWizard($rootScope, $compile, $timeout, $http, $templateCache, $minute);
            directive.$inject = ["$rootScope", "$compile", "$timeout", "$http", "$templateCache", "$minute"];
            return directive;
        }

        //link = ($scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes, ngModel: ng.INgModelController) =>
        controller = ($scope: any) => { //, element: ng.IAugmentedJQuery, attrs: ng.IAttributes, ngModel: ng.INgModelController) => {
            let init = false;

            $scope.wizard = {global: {}, config: $scope.config, loading: false};
            $scope.project = $scope.ngModel;
            $scope.session = this.$rootScope.session;

            let getMaxIndex = () => {
                let jump = $scope.config.jumps;
                return jump === 'all' ? $scope.steps.length - 1 : (jump === 'restricted' ? ($scope.project.wizard ? parseInt($scope.project.wizard.maxIndex || 0) : 0) : 0);
            };

            let setMaxIndex = (index) => {
                if ($scope.config.jumps === 'restricted') {
                    angular.extend($scope.project, {wizard: {maxIndex: index}});
                }
            };

            $scope.wizard.call = (fName: string) => {
                let fn = $scope.wizard.overrides[fName] || $scope.wizard[fName];
                return fn();
            };

            $scope.wizard.next = () => {
                $scope.wizard.loading = true;

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

                        if (step && typeof $scope.config.onNext === 'function') {
                            $scope.config.onNext(step);
                        }
                    };

                    if (typeof $scope.config.submit === 'function') {
                        let result = $scope.config.submit();

                        if (result instanceof Promise) {
                            result.then(next);//.catch(() => 1);
                        } else {
                            next();
                        }
                    } else {
                        next();
                    }
                }
            };

            $scope.wizard.back = () => {
                let step = $scope.wizard.load(typeof $scope.wizard.index == 'undefined' ? 0 : ($scope.wizard.index || 0) - 1, false);

                if (step && typeof $scope.config.onBack === 'function') {
                    $scope.config.onBack(step);
                }
            };

            $scope.wizard.help = (topic, popup = false) => {
                window.open('/members/help/' + topic, popup ? 'popup' : '_blank', popup ? 'width=640,height=480' : '');
            };

            $scope.wizard.jump = (index) => {
                let mode = $scope.config.jumps || 'none';

                if ((mode === 'all') || (mode === 'restricted' && index <= getMaxIndex())) {
                    $scope.wizard.load(index, true);
                }
            };

            $scope.wizard.load = (index: number, ltr: boolean) => {
                let interval = $scope.config.interval || 500;

                if (index >= 0 && index < $scope.steps.length) {
                    $scope.wizard.index = index;

                    setMaxIndex(Math.max(index, getMaxIndex()));

                    let step = $scope.wizard.getUrl($scope.steps[index]);
                    let loaderDiv = $('#loaderDiv');
                    let preloaderDiv = $('#preloaderDiv');

                    angular.extend($scope.wizard, {submit: null, activeDiv: loaderDiv, nextEnabled: () => true, overrides: {}});

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

                    window.history.pushState({index: index + 1}, $scope.steps[index].heading || 'Wizard', '#!/' + $scope.steps[index].url);
                    this.$timeout(() => $scope.wizard.activeDiv.find('.auto-focus:first').focus(), interval + 250);
                    this.$timeout(() => $scope.wizard.loading = false);

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
                            let start = $.trim((window.location.hash || '').replace(/^#!\//, ''));
                            let step = start ? Minute.Utils.findWhere($scope.steps, {url: start}) : $scope.steps[0];

                            if (step) {
                                let index = $scope.steps.indexOf(step);
                                $scope.wizard.load(index === -1 ? 0 : index <= getMaxIndex() ? index : 0, true);
                            }
                        });
                    }
                }
            });

            $scope.run = (code) => {
                if (typeof code == 'function') {
                    code();
                }
            };

            window.onpopstate = function (event) {
                if (event && event.state && event.state.index > 0) {
                    //$scope.wizard.load(event.state.index - 1);
                }
            }
        }
    }

    angular.module('AngularWizard', ['MinuteFramework'])
        .config(['$controllerProvider', ($controllerProvider) => angular.module('WizardApp').controller = $controllerProvider.register])
        .directive('angularWizard', AngularWizard.factory());
}
