const stripDspace = (inputStr: string): string => {
    return `${inputStr.replace("dspace:", "")}`;
};

export default stripDspace