import { Field, Form, Formik } from "formik"
import React from "react"
import AuthContext from "../context/AuthContext"
import { fetchWithToken } from "../utils/api"


export default function Compose(props) {
    const [token, setToken] = React.useContext(AuthContext)


    return (
        <Formik
            initialValues={{
                title: "",
                content: "",
                isPrivate: false
            }}
            onSubmit={async (values) => {
                const response = await fetchWithToken("/posts", token, setToken, {
                    method: "POST",
                    body: values,
                })

                if (response.ok) {
                    props.history.push("/profile/@me")
                }
            }}
        >
            {formik => (
                <Form className="max-w-2xl mx-auto my-4 flex flex-col gap-4 w-full text-lg">
                    <h1 className="text-center text-3xl">compose a new post</h1>
                    <Field type="text" name="title" placeholder="title" className="rounded-md border-2 border-gray-200 focus:border-blue-500 outline-none py-2 px-3" />
                    <Field as="textarea" name="content" className="rounded-md border-2 border-gray-200 focus:border-blue-500 outline-none py-2 px-3" />

                    <div className="flex flex-row flex-wrap gap-4">
                        <div className="text-gray-700">
                            <label>
                                make this post private
                                <Field type="checkbox" name="isPrivate" className="ml-2" />
                            </label>
                        </div>
                        <div className="flex-grow" />
                        <button type="submit" className="rounded-lg bg-green-300 disabled:bg-gray-200 hover:bg-green-500 transition-colors duration-300 px-8 py-4 my-2">
                            publish
                        </button>
                    </div>
                </Form>
            )}
        </Formik>
    )
}