[![Build Status](https://travis-ci.org/s-morgan-jeffries/angular-parse-interface.svg?branch=master)](https://travis-ci.org/s-morgan-jeffries/angular-parse-interface)

A module for using Parse.com in AngularJS applications.

NB: This is pre-pre-alpha.

To use, either clone the repository, or do:

<pre><code>$ bower install --save s-morgan-jeffries/angular-parse-interface</code></pre>

Include the built module file in your index.html:

<pre><code>&lt;script src="bower_components/angular-parse-interface/dist/angular-parse-interface.js"&gt;&lt;/script&gt;</code></pre>

Then include the module as a dependency of your app module:

<pre><code>angular.module('yourApp', ['angularParseInterface']);</code></pre>

The module creates the parseInterface service, which has a single method: createAppInterface. Use it like so:

<pre><code>var appConfig = {
        applicationId: 'your-parse-app-ID',
        restKey: 'your-parse-REST-API-key'
    };
    
var appInterface = parseInterface.createAppInterface(appConfig);
</code></pre>

The appInterface has four properties:
<ul>
<li><strong>objectFactory</strong>: Call this with a className argument to create an angular Resource/Parse Object.</li>
<li><strong>User</strong>: A special angular Resource decorated with signUp, signIn, signOut, and current (returns current user) methods</li>
<li><strong>Query</strong>: A constructor that you call with a Resource argument and that returns a query builder.</li>
<li><strong>getCloudCaller</strong>: A factory that takes a cloud function name and returns a function that will call the named cloud function asynchronously.</li>
</ul>

I'll write clearer documentation when things are a little further along. In the meantime, feel free to look at the source code.