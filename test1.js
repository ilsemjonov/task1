// 1. Code analysis
// You have a piece of code from some application. Go through this code line by line and explain in
// detail (in writing) what do you see, what is happening.



export const submitOrder = () =>                                        // exporting constant variable that gets initialized with an arrow function that takes no arguments,
    async function thunk(dispatch, getState) {                          // arrow function returns asynchronous function that accepts two function references as arguments,
        dispatch(actions.order.submit());                               // calling referenced function 'dispatch' with what the 'actions.order.submit()' method returns,
        const { cart, user } = getState();                              // destructuring properties 'cart' and 'user' from the object that is returned from getState() method and assigning their values to the same named constants,
        const { cartId } = cart;                                        // destructuring property 'cartId' from the 'cart' object, another words, finding 'cartId' property in 'cart' object and assigning that property value to the new 'cartId' constant variable, so "const { cartId } = cart" is the same as "const cartId = cart.cartId",
        if (!cartId) {                                                  // if there is no cartId property,
            throw new Error('Missing required information: cartId');    // creating error message,
        }                                                               // if there is 'cartId' property, execution continues,
        const shipping_address = await retrieveShippingAddress();       // initializing constant variable with the value that is asynchronously returned from 'retrieveShippingAddress()' function call,
        const comment = await retrieveComment();                        // initializing constant variable with the value that is asynchronously returned from 'retrieveComment()' function call,
        let billing_address, paymentMethod;                             // declaring two variables with changeable value,
        cart.paymentMethods.map(payment_method => {                     // calling 'map()' method on every element of 'paymentMethods' array, then executing arrow funtion on every element of that array ('payment_method') that is accepted through argument of arrow function,
            if (payment_method.code === 'free') {                       // if 'payment_method' element has 'code' property that is strictly equals to string 'free',
                billing_address = shipping_address;                     // assigning the value of previously initialized 'shipping_address' constant variable to the previously declared but not initialized variable 'billing_address',
                paymentMethod = payment_method;                         // assigning the value of the function argument to the previously declared but not initialized variable 'paymentMethod',
            }
        });
        if (!billing_address) billing_address = await retrieveBillingAddress();                         // if after described above actions 'billing_address' variable has falsy value (null), it is being assigned with value that is asynchronously returned from 'retrieveBillingAddress()' function call,
        if (!paymentMethod) paymentMethod = await retrievePaymentMethod();                              // if after described above actions 'paymentMethod' variable has falsy value (null), it is being assigned with value that is asynchronously returned from 'retrievePaymentMethod()' function call,
        if (billing_address.sameAsShippingAddress) { billing_address = shipping_address; }              // if 'billing_address' variable has truthy 'sameAsShippingAddress' property (sameAsShippingAddress = true), then assigning the value of 'shipping_address' constant to the 'billing_address' variable,
        try {                                                                                           // then executing the code below
            // POST to payment-information to submit the payment details and billing address,
            // Note: this endpoint also actually submits the order.

            const guestPaymentEndpoint = `/rest/V1/guest-carts/${cartId}/payment-information`;          // creating template string with interpolated 'cardId' value in it, and assigning this string to 'guestPaymentEndpoint' constant,

            const authedPaymentEndpoint = '/rest/V1/carts/mine/payment-information';                    // assigning a string to 'authedPaymentEndpoint' constant,
            const paymentEndpoint = user.isSignedIn ? authedPaymentEndpoint : guestPaymentEndpoint;     // evaluating conditional expression with ternary operator '?:', if 'isSignedIn' property of 'user' object is truthy, then 'paymentEndpoint' constant gets initialized with 'authedPaymentEndpoint' value; if 'isSignedIn' property is falsy, constant gets initialized with 'guestPaymentEndpoint' value,
            const response = await request(paymentEndpoint, {                                           // constant being initialized with value that is asynchronously returned from 'request' function call; 'request' function accepts 'paymentEndpoint' value as an url address for making request to, and a parameters object as a second value,
                method: 'POST',                                 // property 'method' contains string value of request type ( one of several like 'get', 'post', 'put', 'delete' and others),
                body: JSON.stringify({                          // body property gets assigned with the JSON string that is returned after 'JSON.stringify()' method call, which in its turn accepts javascript value, in this case - object,
                    billingAddress: billing_address,            // initializing 'billingAddress' property with 'billing_address' variable value, 

                    cartId: cartId,                             // initializing 'cartId' property with 'cartId' constant value, also in new syntax could also be written as simply 'cartId' ( {cartId: cartId} the same as {cartId} ),

                    email: shipping_address.email,              // initializing 'email' property with 'shipping_address' object`s 'email' property value, 

                    paymentMethod: {                            // initializing 'paymentMethod' property with an object, that consists of:
                        additional_data: {                      // 'additional_data' property that is an object itself, that consist of two properties:
                            payment_method_nonce: paymentMethod.data && paymentMethod.data.nonce,       // 'payment_method_nonce' is boolean value property, that is truthy only if 'paymentMethod' object has 'data' property that is truthy itself (not null) and 'data' property, as an object, has truthy 'nonce' value as well,
                            payment_comment: comment            // 'payment_comment' property gets assigned with previously retrieved 'comment' constant value,
                        },
                        method: paymentMethod.code              // 'method' property gets assigned with value of 'paymentMethod' object's 'code' property,
                    }
                }),
                auth: user.isSignedIn                           // property 'auth' gets assigned with boolean value of 'isSignedIn' property of 'user' object,
            });
            dispatch(                                           // calling dispatch method with the result of calling 'checkoutReceiptActions' object's 'setOrderInformation' method,
                checkoutReceiptActions.setOrderInformation({    // that in its turn accepts an object with two fields:
                    id: response,                               // 'id', gets assigned with value of previously retrieved 'response' constant value,
                    billing_address                             // and 'billing_address', again ( {billing_address: billing_address} the same as {billing_address} )
                })
            );
            // Clear out everything we've saved about this cart from
            // local storage.
            await clearBillingAddress();                        // calling asynchronously executed functions,
            await clearCartId();                                // to get these await functions executed we dont need to wait until the previous function call returns,
            await clearPaymentMethod();                         // ...
            await clearShippingAddress();                       // these all get executed unordered
            await clearShippingMethod();                        // ...
            await clearComment();                               // ...
            await clearApolloCache([                            // this function also accepts an argument in the form of an array, which consists of two elements of type String,
                '$ROOT_QUERY.customerOrders',   
                'CustomerOrder'
            ]); // TODO add new order to cache instead of clearing it
            dispatch(actions.order.accept(response));               // calling 'actions.order.accept' method with the 'response' constant value as an argument, and then sending the result of 'accept' method execution to the 'dispatch' method and executing 'dispatch' as well,
        } catch (error) {                                           // if the code in the try() section produced an error, calling 'catch()' function with the error object as argument,
            dispatch(actions.order.reject(error.baseMessage));      // calling 'actions.order.reject()' method with 'baseMessage' property of error object as argument, and then calling dispatch method with the result of calling that 'actions.order.reject()' method.
        }
    };