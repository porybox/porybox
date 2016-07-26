/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
'use strict';
import Promise from 'bluebird';
const VALID_USERNAME_REGEX = require('../../api/services/Constants').VALID_USERNAME_REGEX;

module.exports = class Login {
  constructor ($scope, $http, errorHandler) {
    this.$scope = $scope;
    this.$http = $http;
    this.errorHandler = errorHandler;
    this.VALID_USERNAME_REGEX = VALID_USERNAME_REGEX;
  }
  register () {
    return Promise.resolve(this.$http({
      method: 'POST',
      url: '/api/v1/auth/local/register',
      data: {
        name: this.registerName,
        password: this.registerPassword,
        email: this.registerEmail
      }
    })).then(() => {
      window.location = '/';
    }).catch(
      {status: 401, data: 'Error.Passport.Username.Taken'},
      () => {
        this.$scope.registerForm.name.$setValidity('available', false);
        this.$scope.$apply();
      }
    ).catch(this.errorHandler);
  }
  login () {
    return Promise.resolve(this.$http({
      method: 'POST',
      url: '/api/v1/auth/local',
      data: {
        name: this.loginName,
        password: this.loginPassword
      }
    })).then(() => {
      window.location = '/';
    }).catch(
      {status: 401, data: 'Error.Passport.Password.Wrong'},
      {status: 401, data: 'Error.Passport.Username.NotFound'},
      () => {
        this.$scope.loginForm.password.$setValidity('correct', false);
        this.$scope.$apply();
      }
    ).catch(this.errorHandler);
  }
};
