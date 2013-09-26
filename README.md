# Meteor Smart Collections [![Build Status](https://travis-ci.org/arunoda/meteor-smart-collections.png?branch=master)](https://travis-ci.org/arunoda/meteor-smart-collections)

This is a complete re-write of the MongoDB Collection implementation for Meteor. Designed with following 3 areas in mind

* Speed
* Efficiency (Memory & CPU)
* Scalability

> This is not a toy project! But a complete Collection replacement with a [well tested](https://github.com/arunoda/meteor-smart-collections/blob/master/test_cases.todo) source code. Still we **might** have bugs :)

### [Click here for implementation details of Smart Collections](http://meteorhacks.com/introducing-smart-collections.html)

## Install

Install Smart Collections from Atmosphere
    
    mrt add smart-collections

Install From Git (If you are not using Meteorite)

    mkdir -p packages
    #make sure you created the packages folder
    git submodule add https://github.com/arunoda/meteor-smart-collections.git packages/smart-collections

## Usage

Replace `Meteor.Collection` with `Meteor.SmartCollection`. Just that!

eg:-

    //old code
    Posts = new Meteor.Collection('posts');

    //with smart collections
    Posts = new Meteor.SmartCollection('posts');

## Compatibility

* Almost compatible with exiting `Collection` [API](http://docs.meteor.com/#collections)
* But server side `Cursor.observe()` does not exists
* `_id` must be a `String`
* Field Filtering(Projection) support is minimal - http://git.io/LMeAMg

## Scalability

* Can be easily scaled with mongodb [`oplog`](http://docs.mongodb.org/manual/core/replica-set-oplog/)
* Follow this guide on how to [scale meteor](http://meteorhacks.com/lets-scale-meteor.html) with Smart Collections.
