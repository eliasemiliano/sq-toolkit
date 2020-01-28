'use strict';

describe('Shuffler Test', function () {

    let sinon  = require('sinon');
    let chai   = require('chai');
    let expect = chai.expect;
    let assert = chai.assert;

    let Shuffler = require('../shuffler');

    let TEST_VERSIONS = [
        { size: 30, meta: 1 },
        { size: 15, meta: 2 },
        { size: 5,  meta: 3 },
        { size: 10, meta: 4 },
        { size: 40, meta: 5 }
    ];

    describe('1. Test constructor()', function () {

        it('1. Construct Shuffler with valid id and non ordered versions. Expect to have versions and positions built ordered by size', function () {

            let opts = {
                id: 1,
                versions: TEST_VERSIONS
            };

            let shuffler = new Shuffler(opts);

            expect(shuffler.id).to.equals(1);

            expect(shuffler.versions).to.eql([
                { size: 40, meta: 5 },
                { size: 30, meta: 1 },
                { size: 15, meta: 2 },
                { size: 10, meta: 4 },
                { size: 5,  meta: 3 }
            ]);

            expect(shuffler.probs).to.eql([
                0.4,
                0.3,
                0.15,
                0.1,
                0.05
            ]);

            // Test positions
            let i = 0;

            for (i = 0; i < 40; i++) {
                expect(shuffler.positions[i]).to.equals(0);
            }
            for (; i < (40 + 30); i++) {
                expect(shuffler.positions[i]).to.equals(1);
            }
            for (; i < (40 + 30 + 15); i++) {
                expect(shuffler.positions[i]).to.equals(2);
            }
            for (; i < (40 + 30 + 15 + 10); i++) {
                expect(shuffler.positions[i]).to.equals(3);
            }
            for (; i < (40 + 30 + 15 + 10 + 5); i++) {
                expect(shuffler.positions[i]).to.equals(4);
            }
            expect(i).to.equals(100);
        });

        it('2. Construct Shuffler with invalid id (smaller than min). Expect to throw Exception', function () {

            let opts = {
                id: Shuffler.ShufflerId.MIN - 1,
                versions: []
            };

            try {
                let shuffler = new Shuffler(opts);
                chai.assert();
            }
            catch(err) {
                expect(err.code).to.equals('ERROR_SHUFFLER_INVALID_ID');
                expect(err.message).to.equals('Shuffle id must be an Integer between [1,100000]');
            }
        });

        it('3. Construct Shuffler with invalid id (bigger than max). Expect to throw Exception', function () {

            let opts = {
                id: Shuffler.ShufflerId.MAX + 1,
                versions: []
            };

            try {
                let shuffler = new Shuffler(opts);
                chai.assert();
            }
            catch(err) {
                expect(err.code).to.equals('ERROR_SHUFFLER_INVALID_ID');
                expect(err.message).to.equals('Shuffle id must be an Integer between [1,100000]');
            }
        });

        it('4. Construct Shuffler with versions sizes lower than 100. Expect to throw Exception', function () {

            let opts = {
                id: 1,
                versions: [
                    { size: 50 },
                    { size: 49 }
                ]
            };

            try {
                let shuffler = new Shuffler(opts);
                chai.assert();
            }
            catch(err) {
                expect(err.code).to.equals('ERROR_SHUFFLER_UNDERFLOW');
            }
        });

        it('5. Construct Shuffler with versions sizes higher than 100. Expect to throw Exception', function () {

            let opts = {
                id: 1,
                versions: [
                    { size: 50 },
                    { size: 51 }
                ]
            };

            try {
                let shuffler = new Shuffler(opts);
                chai.assert();
            }
            catch(err) {
                expect(err.code).to.equals('ERROR_SHUFFLER_OVERFLOW');
            }
        });
    });

    describe('2. Test .random() method', function () {

        let shuffler = null;

        before(function () {

            let opts = {
                versions: TEST_VERSIONS
            };

            shuffler = new Shuffler(opts);
        });

        it('1. Get random from shuffler with empty versions. Expect to return null', function () {

            let emptyShuffler = new Shuffler();

            expect(emptyShuffler.random()).to.equals(null);
            expect(emptyShuffler.random('dummy_seed')).to.equals(null);
        });

        it('2. Get random from shuffler. Expect to return versions', function () {

            _testRandom(0,    5);
            _testRandom(0.39, 5);

            _testRandom(0.4,  1);
            _testRandom(0.69, 1);

            _testRandom(0.7,  2);
            _testRandom(0.84, 2);

            _testRandom(0.85, 4);
            _testRandom(0.94, 4);

            _testRandom(0.95, 3);
            _testRandom(0.99, 3);
        });

        it('3. Get random seed from shuffle. Expect to always the same value', function () {

            let version = shuffler.random('dummy_seed');
            expect(version.meta).to.equals(5);

            version = shuffler.random('dummy_seed');
            expect(version.meta).to.equals(5);

            version = shuffler.random('dummy_seed');
            expect(version.meta).to.equals(5);

            version = shuffler.random('dummy_seed');
            expect(version.meta).to.equals(5);
        });

        function _testRandom(randomNumber, expectedMeta) {
            let randomStub = sinon.stub(Math, 'random').returns(randomNumber);

            let version = shuffler.random();

            expect(randomStub.calledOnce).to.equals(true);
            randomStub.restore();

            expect(version.meta).to.equals(expectedMeta);
        }

    });

    describe('3. Test .randomByMD5() method', function () {

        let shuffler = null;

        before(function () {

            let opts = {
                id: 1,
                versions: TEST_VERSIONS
            };

            shuffler = new Shuffler(opts);
        });

        it('1. Get random by MD5 from shuffler without id. Expect to return null', function () {

            let shuffler = new Shuffler({ versions: TEST_VERSIONS });

            try {
                shuffler.randomByMD5('dummy_hash');
                chai.assert();
            }
            catch(err) {
                expect(err.code).to.equals('ERROR_SHUFFLER_REQUIRED_ID');
                expect(err.message).to.equals('Shuffle id is mandatory to use hash random');
            }
        });

        it('2. Get random by MD5 from shuffler with empty versions. Expect to return null', function () {

            let emptyShuffler = new Shuffler({ id: 1, versions: [] });
            expect(emptyShuffler.randomByMD5('dummy_hash')).to.equals(null);
        });

        it('3. Get random by MD5. Expect to return always the same versions for each hash', function () {

            _testRandom('c4ca4238a0b923820dcc509a6f75849b', 1);
            _testRandom('c81e728d9d4c2f636f067f89cc14862c', 5);
            _testRandom('eccbc87e4b5ce2fe28308fd9f2a7baf3', 3);
            _testRandom('a87ff679a2f3e71d9181a67b7542122c', 5);
        });

        function _testRandom(hash, expectedMeta) {
            let version1 = shuffler.randomByMD5(hash);
            expect(version1.meta).to.equals(expectedMeta);

            version1 = shuffler.randomByMD5(hash);
            expect(version1.meta).to.equals(expectedMeta);

            version1 = shuffler.randomByMD5(hash);
            expect(version1.meta).to.equals(expectedMeta);

            version1 = shuffler.randomByMD5(hash);
            expect(version1.meta).to.equals(expectedMeta);
        }

    });
});