---
external: false
title: "How to deploy Kubernetes Dashboard with read-only access"
description: "Deploying Kubernetes Dashboard with read-only access"
date: 2023-12-28
---

A couple of weeks ago DigitalOcean announced end of support of the their built-in Kubernetes dashboard. I was a bit disappointed because my team was using it for a while and it was a great tool to quickly check the status of the cluster and the pods, especially for people that are not familiar with Kubernetes. I am sure that there are a lot of [other people](https://ideas.digitalocean.com/kubernetes/p/disappointed-to-see-the-k8s-dashboard-deprecation) that are in the same situation, so I decided to write a short post about how to deploy the official Kubernetes Dashboard with read-only access.

I started looking for a replacement that would be easy to deploy and would provide similar functionality. I have used [Lens](https://k8slens.dev/) community version in the past, It was convenient and easy to use, but after trying to install again with their latest changes, It seems to me a bit too complex to setup and use for our simple use case. After that I looked at different alternatives, but at the end I decided to go with the official Kubernetes Dashboard because It's a great tool and have a big community behind it.

Why read only access? I think it's a good practice to have read only access to the cluster, especially for people that are not familiar with Kubernetes. It's also a good practice to have a separate read-write access for people that need to deploy or update the application. I will show you how to create a read only access to the Kubernetes Dashboard.

## Install Kubernetes Dashboard

Requirements:

- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
- kubeconfig with admin access to the cluster

The first step is to install the Kubernetes Dashboard. Currently the latest version is v3.0.0 but it's still in alpha so we will go with v2.7.0 instead. You can find the latest version [here](https://github.com/kubernetes/dashboard/releases). I would also recommend to download the yaml file instead, because you can set a [resource limit](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) for the Kubernetes dashboard pods and then apply it, you can also save it somewhere in a git repo.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

After the deployment is finished you can check the status of the pods

```bash
kubectl get pods -n kubernetes-dashboard
```

To access the dashboard you need to create a proxy to the kubernetes-dashboard service

```bash
kubectl proxy
```

Then you can access the dashboard at [http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/)

To login you can use your Kubernetes config file, usually located at `~/.kube/config`, your Kubernetes config file should look something like this:

```yaml
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: DATA+OMITTED
      server: https://test-k8s-cluster-url.com
    name: test-k8s
contexts:
  - context:
      cluster: test-k8s
      user: clusterUser_testing_test-k8s
    name: test-k8s
current-context: test-k8s
kind: Config
preferences: {}
users:
  - name: clusterUser_testing_test-k8s
    user:
      client-certificate-data: DATA+OMITTED
      client-key-data: DATA+OMITTED
      token: REDACTED
```

Or use can use the token from the config file. You can either open the config file and copy the token or use the following command to get the token.

```bash
grep 'token:' ~/.kube/config| head -1 | cut -d ":" -f2
```

## Create a read only access to the kubernetes dashboard

The next step is to create a read only kubernetes config file. First, we need to create service account, a secret , a role and roleBinding for kubernetes-dashboard namespace, you can download and apply the [following yaml file](https://gist.github.com/jalilbengoufa/cc5c0801453970de8ff0da6b3990fc03) for a default configuration, or you can apply it directly like this.

```bash
kubectl apply -f https://gist.githubusercontent.com/jalilbengoufa/cc5c0801453970de8ff0da6b3990fc03/raw/f4c0234cfba8386dc8a49d7a25c402d50c6a7982/k8s-dashboard%2520-read-only-recommended.yaml
```

here is the content of the yaml file

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readonly-user
  namespace: default
automountServiceAccountToken: false
---
apiVersion: v1
kind: Secret
metadata:
  name: secret-readonly-user
  annotations:
    kubernetes.io/service-account.name: "readonly-user"
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: readonly-role
rules:
  - apiGroups: ["", "apps", "extensions", "batch"]
    resources:
      [
        "pods",
        "deployments",
        "replicasets",
        "pods/log",
        "configmaps",
        "services",
        "events",
        "namespaces",
        "nodes",
        "limitranges",
        "persistentvolumes",
        "persistenttvolumeclaims",
        "resourcequotas",
        "statefulsets",
        "replicationcontrollers",
        "jobs",
        "daemonsets",
        "cronjobs",
      ]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: readonly-rolebinding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: readonly-user
    namespace: default
roleRef:
  kind: Role
  name: readonly-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: kubernetes-dashboard
  name: readonly-role
rules:
  - apiGroups:
      [
        "",
        "apps",
        "extensions",
        "rbac.authorization.k8s.io",
        "networking.k8s.io",
      ]
    resources:
      [
        "pods",
        "deployments",
        "replicasets",
        "pods/log",
        "configmaps",
        "services",
        "events",
        "namespaces",
        "nodes",
        "limitranges",
        "persistentvolumes",
        "persistentvolumeclaims",
        "resourcequotas",
        "services/proxy",
        "serviceaccounts",
        "roles",
        "nodes",
        "rolebindings",
        "networkpolicies",
        "clusterroles",
        "clusterrolebindings",
        "persistentvolumes",
        "storageclasses",
        "secrets",
        "ingressclasses",
        "ingresses",
      ]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: readonly-rolebinding-kube-dashboard
  namespace: kubernetes-dashboard
subjects:
  - kind: ServiceAccount
    name: readonly-user
    namespace: default
roleRef:
  kind: Role
  name: readonly-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-clusterrole
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly-clusterrolebinding
subjects:
  - kind: ServiceAccount
    name: readonly-user
    namespace: default
roleRef:
  kind: ClusterRole
  name: readonly-clusterrole
  apiGroup: rbac.authorization.k8s.io
```

After apply the yaml file you can get the token for the readonly-user service account

if you can use base64 command to decode the token

```bash
kubectl -n default get secret secret-readonly-user -o jsonpath='{.data.token}' | base64 -d
```

If not, you can describe the token then copy the token value from the output

```bash
kubectl describe secret secret-readonly-user
```

Now you can use the token to login to the dashboard with read only access but still doing the proxy access with the admin config file. We will fix that in the next step.

## Create a read only kubernetes config context file

The next step is to create a read only kubernetes config context, let's say your config file looks like this

```yaml
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: DATA+OMITTED
      server: https://test-k8s-cluster-url.com
    name: test-k8s
contexts:
  - context:
      cluster: test-k8s
      user: clusterUser_testing_test-k8s
    name: test-k8s
current-context: test-k8s
kind: Config
preferences: {}
users:
  - name: clusterUser_testing_test-k8s
    user:
      client-certificate-data: DATA+OMITTED
      client-key-data: DATA+OMITTED
      token: REDACTED
```

- You need replace the user value, here it's `clusterUser_testing_test-k8s` with `readonly-user`.
- Replace the token with the token you got from the previous step, but without decoding the token using this command.

```bash
kubectl -n default get secret secret-readonly-user -o jsonpath='{.data.token}'
```

The final config file should look like this

```yaml
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: DATA+OMITTED
      server: https://test-k8s-cluster-url.com
    name: test-k8s
contexts:
  - context:
      cluster: test-k8s
      user: readonly-user
    name: test-k8s
current-context: test-k8s
kind: Config
preferences: {}
users:
  - name: readonly-user
    user:
      client-certificate-data: DATA+OMITTED
      client-key-data: DATA+OMITTED
      token: ACCOUNT_TOKEN_FROM_PREVIOUS_STEP
```

Save the file and create a proxy access to the kubernetes-dashboard service using the read only config file

```bash
kubectl --kubeconfig={PATH_TO_READONLY_CONFIG_FILE} proxy
```

Now you can access the dashboard using read only config context file to proxy the kubernetes dashboard service and then login.

- By selecting the generated config file created

- Or by using the decoded token you got from the previous steps .

For contact or feedback you can reach me by email bellow or on twitter, linkedIn, links are in the footer.

```txt
iamrootin@proton.me
```
