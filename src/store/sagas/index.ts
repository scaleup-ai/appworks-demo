import { all, fork } from 'redux-saga/effects';
import { watchXeroSagas } from './xero.saga';
import { watchCollectionsSagas } from './collections.saga';
import { watchEmailSagas } from './email.saga';
import { watchPaymentSagas } from './payment.saga';

export default function* rootSaga() {
  yield all([
    fork(watchXeroSagas),
    fork(watchCollectionsSagas),
    fork(watchEmailSagas),
    fork(watchPaymentSagas),
  ]);
}