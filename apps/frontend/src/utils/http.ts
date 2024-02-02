import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: "/api/", auth: {
        username: "admin",
        password: "admin"
    }
})

export default axiosInstance