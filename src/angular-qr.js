(function(QRCode){
  'use strict';

  angular.module('ja.qr', [])
  .controller('QrCtrl', ['$scope', function($scope){
    $scope.getTypeNumeber = function(){
      return $scope.typeNumber || 0;
    };

    $scope.getCorrection = function(){
      var levels = {
        'L': 1,
        'M': 0,
        'Q': 3,
        'H': 2
      };

      var correctionLevel = $scope.correctionLevel || 0;
      return levels[correctionLevel] || 0;
    };

    $scope.getText = function(){
      return $scope.text || '';
    };

    $scope.getSize = function(){
      return $scope.size || 250;
    };

    $scope.isNUMBER = function(text){
      var ALLOWEDCHARS = /^[0-9]*$/;
      return ALLOWEDCHARS.test(text);
    };

    $scope.isALPHA_NUM = function(text){
      var ALLOWEDCHARS = /^[0-9A-Z $%*+\-./:]*$/;
      return ALLOWEDCHARS.test(text);
    };

    $scope.is8bit = function(text){
      for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i);
        if (code > 255) {
          return false;
        }
      }
      return true;
    };

    $scope.getColorFor = function(color, option){
      if(option === 'background'){
        return color || '#fff';
      }

      if(option === 'foreground'){
        return color || '#000';
      }
    }

    $scope.checkInputMode = function(inputMode, text){
      if (inputMode === 'NUMBER' && !$scope.isNUMBER(text)) {
        throw new Error('The `NUMBER` input mode is invalid for text.');
      }
      else if (inputMode === 'ALPHA_NUM' && !$scope.isALPHA_NUM(text)) {
        throw new Error('The `ALPHA_NUM` input mode is invalid for text.');
      }
      else if (inputMode === '8bit' && !$scope.is8bit(text)) {
        throw new Error('The `8bit` input mode is invalid for text.');
      }
      else if (!$scope.is8bit(text)) {
        throw new Error('Input mode is invalid for text.');
      }

      return true;
    };

    $scope.getInputMode = function(text){
      var inputMode = $scope.inputMode;
      inputMode = inputMode || ($scope.isNUMBER(text) ? 'NUMBER' : undefined);
      inputMode = inputMode || ($scope.isALPHA_NUM(text) ? 'ALPHA_NUM' : undefined);
      inputMode = inputMode || ($scope.is8bit(text) ? '8bit' : '');

      return $scope.checkInputMode(inputMode, text) ? inputMode : '';
    };
  }])
  .directive('qr', ['$timeout', '$window', function($timeout, $window){

    return {
      restrict: 'E',
      template: '<canvas ng-hide="image"></canvas><img ng-if="image" ng-src="{{canvasImage}}"/>',
      scope: {
        typeNumber: '=',
        correctionLevel: '=',
        inputMode: '=',
        size: '=',
        text: '=',
        image: '=',
        background: '=',
        foreground: '=',
        outlineModules: '=',
        rotation: '='
      },
      controller: 'QrCtrl',
      link: function postlink(scope, element, attrs){

        if (scope.text === undefined) {
          throw new Error('The `text` attribute is required.');
        }

        var canvas = element.find('canvas')[0];
        var canvas2D = !!$window.CanvasRenderingContext2D;

        scope.TYPE_NUMBER = scope.getTypeNumeber();
        scope.TEXT = scope.getText();
        scope.CORRECTION = scope.getCorrection();
        scope.SIZE = scope.getSize();
        scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
        scope.BACKGROUND_COLOR = scope.getColorFor(scope.background, 'background');
        scope.FOREGROUND_COLOR = scope.getColorFor(scope.foreground, 'foreground');
        scope.canvasImage = '';
        scope.OUTLINE_MODULES = parseInt(scope.outlineModules) || 0;
        scope.ROTATION = scope.rotation || 0;

        var drawOutline = function(context, qr, modules, tile, outline){
          context.fillStyle = scope.BACKGROUND_COLOR;
          //left outline
          context.fillRect(0, 0, Math.floor(outline), Math.floor((outline * 2) + scope.SIZE));

          //right outline
          context.fillRect(Math.floor(scope.SIZE + outline), 0, outline, Math.floor((outline * 2) + scope.SIZE));

          //top outline
          context.fillRect(outline, 0, Math.floor(scope.SIZE), Math.floor(outline));

          //bottom outline
          context.fillRect(outline, Math.floor(outline + scope.SIZE), Math.floor(scope.SIZE), Math.floor(outline));
        }

        var draw = function(context, qr, modules, tile, outline){
          for (var row = 0; row < modules; row++) {
            for (var col = 0; col < modules; col++) {
              var w = (Math.floor((col + 1) * tile) - Math.floor(col * tile)),
              h = (Math.floor((row + 1) * tile) - Math.floor(row * tile));
              context.fillStyle = qr.isDark(row, col) ? scope.FOREGROUND_COLOR : scope.BACKGROUND_COLOR;
              context.fillRect(Math.floor(col * tile) + outline, Math.floor(row * tile) + outline, w, h);
            }
          }

          drawOutline(context, qr, modules, tile, outline);
        };

        var render = function(canvas, value, typeNumber, correction, size, inputMode){
          var trim = /^\s+|\s+$/g;
          var text = value.replace(trim, '');

          var qr = new QRCode(typeNumber, correction, inputMode);
          qr.addData(text);
          qr.make();

          var context = canvas.getContext('2d');

          var modules = qr.getModuleCount();
          var tile = size / modules;
          var outline = Math.floor(tile * scope.OUTLINE_MODULES);
          canvas.width = canvas.height = size + (2 * outline);

          if (canvas2D) {
            draw(context, qr, modules, tile, outline);

            angular.element(canvas).css({
              'transform': 'rotate('+scope.ROTATION+'deg)'
            });

            scope.canvasImage = canvas.toDataURL() || '';
          }
        };

        render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);

        $timeout(function(){
          scope.$watch('text', function(value, old){
            if (value !== old) {
              scope.TEXT = scope.getText();
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('correctionLevel', function(value, old){
            if (value !== old) {
              scope.CORRECTION = scope.getCorrection();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('typeNumber', function(value, old){
            if (value !== old) {
              scope.TYPE_NUMBER = scope.getTypeNumeber();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('size', function(value, old){
            if (value !== old) {
              scope.SIZE = scope.getSize();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('inputMode', function(value, old){
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('foreground', function(value, old){
            scope.FOREGROUND_COLOR = scope.getColorFor(value, 'foreground');
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('background', function(value, old){
            scope.BACKGROUND_COLOR = scope.getColorFor(value, 'background');
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('outlineModules', function(value, old){
            scope.OUTLINE_MODULES = value;
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('rotation', function(value, old){
            scope.ROTATION = value;
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

        });

      }
    };
  }]);

})(window.QRCode);
