import axios, { AxiosInstance } from "axios";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: "api/",
  auth: {
    username: localStorage.getItem("username"),
    password: localStorage.getItem("password"),
  },
});

export default axiosInstance;
