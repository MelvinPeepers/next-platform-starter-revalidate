const rewrite = async (request, context) => {
    // const path = context.geo?.country?.code === 'AU' ? '/edge/australia' : '/edge/not-australia';
    // return new URL(path, request.url);
    let path;

    if (context.geo?.country?.code === 'AU') {
        path = '/edge/australia';
    } else if (context.geo?.country?.code === 'US') {
        path = '/edge/usa';
    } else {
        path = '/edge/other';
    }

    return new URL(path, request.url);
};

export const config = {
    path: '/edge'
};

export default rewrite;
